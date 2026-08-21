const cfg=window.MOSAIC_MAGIC_CONFIG||{};
const API=String(cfg.SEARCH_API_URL||'').replace(/\/$/,'');
const POLL=Number(cfg.MAGICIAN_POLL_MS||1000);
const debugMode=new URLSearchParams(location.search).get('debug')==='1';

const waiting=document.getElementById('waiting');
const candidateView=document.getElementById('candidateView');
const selectedView=document.getElementById('selectedView');
const conn=document.getElementById('conn');
const queryTitle=document.getElementById('queryTitle');
const totalTime=document.getElementById('totalTime');
const candidateGrid=document.getElementById('candidateGrid');
const selectedImage=document.getElementById('selectedImage');
const selectedQuery=document.getElementById('selectedQuery');
const selectedTiming=document.getElementById('selectedTiming');
const mosaicCanvas=document.getElementById('mosaicCanvas');
const tileSize=document.getElementById('tileSize');
const regenBtn=document.getElementById('regenBtn');
const backBtn=document.getElementById('backBtn');
const debug=document.getElementById('debug');
const debugText=document.getElementById('debugText');

const state={lastKey:'',capture:null,candidates:[],busy:false,receivedAt:0,searchMs:0,selectedIndex:-1};

function mode(name){
  [waiting,candidateView,selectedView].forEach(x=>x.classList.add('hidden'));
  document.getElementById(name).classList.remove('hidden');
}
function key(c){return `${c?.query||''}|${c?.capturedAt||''}`}
function elapsed(){return performance.now()-state.receivedAt}
function fmt(ms){return `${(ms/1000).toFixed(2)}s`}

async function latest(){
  const r=await fetch(`${API}/latest?ts=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}});
  const d=await r.json();
  if(!r.ok||!d?.ok)throw new Error(d?.error||`HTTP_${r.status}`);
  return d.capture||null;
}

async function findCandidates(q){
  const u=new URL(`${API}/images`);
  u.searchParams.set('q',q);
  const r=await fetch(u,{cache:'no-store',headers:{Accept:'application/json'}});
  const d=await r.json();
  if(!r.ok||!d?.ok)throw new Error(d?.error||`HTTP_${r.status}`);
  return (d.results||[]).filter(x=>x.thumbnail||x.imageUrl).slice(0,4);
}

// 高速 Mosaic：不做昂貴的真實照片 matching。
// 先把目標照降成小型色彩網格，再用「照片感 tile」重畫。
// 正式相簿版會把這個 reveal 接到 pinch zoom 的最小層。
function buildMosaicFromImage(img, canvas, blockPx=7){
  const start=performance.now();
  const maxW=420;
  const ratio=(img.naturalHeight||1)/(img.naturalWidth||1);
  const w=maxW, h=Math.max(1,Math.round(w*ratio));

  const sample=document.createElement('canvas');
  const sw=Math.max(18,Math.round(w/blockPx));
  const sh=Math.max(18,Math.round(h/blockPx));
  sample.width=sw; sample.height=sh;
  const sctx=sample.getContext('2d',{willReadFrequently:true});
  sctx.drawImage(img,0,0,sw,sh);

  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#111'; ctx.fillRect(0,0,w,h);

  let data;
  try { data=sctx.getImageData(0,0,sw,sh).data; }
  catch(e) { return {ok:false,error:'CORS',ms:performance.now()-start}; }

  const cw=w/sw, ch=h/sh;
  for(let y=0;y<sh;y++){
    for(let x=0;x<sw;x++){
      const i=(y*sw+x)*4;
      const r=data[i], g=data[i+1], b=data[i+2];
      // deterministic tiny variation: keeps the surface feeling like many thumbnails,
      // while preserving the target portrait from a distance.
      const seed=(x*17+y*31)%17-8;
      const rr=Math.max(0,Math.min(255,r+seed));
      const gg=Math.max(0,Math.min(255,g+seed));
      const bb=Math.max(0,Math.min(255,b+seed));
      const px=x*cw, py=y*ch;
      ctx.fillStyle=`rgb(${rr},${gg},${bb})`;
      ctx.fillRect(px+.45,py+.45,Math.max(.5,cw-.9),Math.max(.5,ch-.9));
      // subtle highlight/shadow gives each cell a miniature-photo feel.
      ctx.fillStyle='rgba(255,255,255,.055)';
      ctx.fillRect(px+.7,py+.7,Math.max(.5,cw-1.4),Math.max(.5,ch*.18));
      ctx.fillStyle='rgba(0,0,0,.06)';
      ctx.fillRect(px+.7,py+ch*.78,Math.max(.5,cw-1.4),Math.max(.5,ch*.14));
    }
  }
  return {ok:true,ms:performance.now()-start,cols:sw,rows:sh};
}

function prebuild(item,img){
  if(item.mosaicReady||item.mosaicBusy)return;
  item.mosaicBusy=true;
  // Let the browser paint Ready first, then use the next frame for mosaic work.
  requestAnimationFrame(()=>{
    const c=document.createElement('canvas');
    const res=buildMosaicFromImage(img,c,5);
    item.mosaicBusy=false;
    item.mosaicResult=res;
    if(res.ok){
      item.mosaicReady=true;
      item.mosaicReadyMs=elapsed();
      item.mosaicData=c.toDataURL('image/jpeg',.88);
    }else{
      item.mosaicError=res.error;
    }
    renderCandidateStatus(item);
    updateTotal();
  });
}

function renderCandidateStatus(item){
  if(!item._els)return;
  const {status,timing,mosaic}=item._els;
  if(item.ready){
    status.textContent='Ready';
    status.className='status ready';
    timing.textContent=`圖片 Ready：${fmt(item.readyMs)}`;
  }
  if(item.mosaicReady){
    mosaic.textContent=`Mosaic Ready：${fmt(item.mosaicReadyMs)}｜生成 ${(item.mosaicResult.ms).toFixed(1)}ms`;
    mosaic.className='mosaic-status ready';
  }else if(item.mosaicError){
    mosaic.textContent=`Mosaic 無法讀取圖片像素（${item.mosaicError}）`;
    mosaic.className='mosaic-status error';
  }else if(item.ready){
    mosaic.textContent='Mosaic 建立中…';
    mosaic.className='mosaic-status loading';
  }
}

function renderCandidates(){
  queryTitle.textContent=state.capture?.query||'';
  candidateGrid.innerHTML='';

  state.candidates.forEach((item,index)=>{
    const card=document.createElement('article');
    card.className='candidate';
    const button=document.createElement('button');
    button.type='button';
    button.innerHTML=`
      <span class="badge">${index+1}</span>
      <img alt="" crossorigin="anonymous">
      <div class="meta">
        <div class="status loading">圖片載入中…</div>
        <div class="timing">等待 Ready</div>
        <div class="mosaic-status">等待 Mosaic</div>
        <div class="source"></div>
      </div>`;
    const img=button.querySelector('img');
    const status=button.querySelector('.status');
    const timing=button.querySelector('.timing');
    const mosaic=button.querySelector('.mosaic-status');
    const source=button.querySelector('.source');
    source.textContent=item.source||item.title||'';
    item._els={status,timing,mosaic};
    item.ready=false; item.readyMs=null; item.mosaicReady=false; item.mosaicBusy=false;
    item.displayUrl=item.thumbnail||item.imageUrl||'';

    img.onload=()=>{
      if(item.ready)return;
      item.ready=true;
      item.readyMs=elapsed();
      renderCandidateStatus(item);
      updateTotal();
      prebuild(item,img);
    };
    img.onerror=()=>{
      if(item.imageUrl && img.src!==item.imageUrl){
        img.src=item.imageUrl; return;
      }
      status.textContent='載入失敗'; status.className='status error';
      timing.textContent='請改選其他候選圖';
      updateTotal();
    };
    img.src=item.displayUrl;

    button.onclick=()=>selectCandidate(index,img);
    card.appendChild(button);
    candidateGrid.appendChild(card);
  });
  mode('candidateView');
}

function drawSelectedMosaic(item,img){
  const res=buildMosaicFromImage(img,mosaicCanvas,Number(tileSize.value));
  if(res.ok){
    selectedTiming.textContent=`候選 ${state.selectedIndex+1}｜圖片 Ready ${fmt(item.readyMs)}｜本次 Mosaic 生成 ${res.ms.toFixed(1)}ms｜${res.cols}×${res.rows} 格`;
  }else if(item.mosaicData){
    const temp=new Image();
    temp.onload=()=>{
      mosaicCanvas.width=temp.width; mosaicCanvas.height=temp.height;
      mosaicCanvas.getContext('2d').drawImage(temp,0,0);
    };
    temp.src=item.mosaicData;
    selectedTiming.textContent=`候選 ${state.selectedIndex+1}｜使用背景預生成 Mosaic`;
  }else{
    selectedTiming.textContent='這張外部圖片禁止 Canvas 讀取；請改選其他候選圖。';
  }
}

function selectCandidate(index,img){
  state.selectedIndex=index;
  const item=state.candidates[index];
  selectedImage.crossOrigin='anonymous';
  selectedImage.src=img.currentSrc||img.src;
  selectedQuery.textContent=state.capture?.query||'';
  const doDraw=()=>{
    if(selectedImage.complete && selectedImage.naturalWidth) drawSelectedMosaic(item,selectedImage);
  };
  selectedImage.onload=doDraw;
  mode('selectedView');
  doDraw();
}

function updateTotal(){
  const ready=state.candidates.filter(x=>x.ready);
  const mosaics=state.candidates.filter(x=>x.mosaicReady);
  const imageText=ready.length===state.candidates.length&&ready.length
    ? `4/4 圖片 ${fmt(Math.max(...ready.map(x=>x.readyMs)))}`
    : `${ready.length}/4 圖片`;
  const mosaicText=mosaics.length===state.candidates.length&&mosaics.length
    ? `4/4 Mosaic ${fmt(Math.max(...mosaics.map(x=>x.mosaicReadyMs)))}`
    : `${mosaics.length}/4 Mosaic`;
  totalTime.textContent=`${imageText}｜${mosaicText}`;
  if(debugMode){
    debugText.textContent=JSON.stringify(state,(k,v)=>k==='_els'?undefined:v,2);
    debug.classList.remove('hidden');
  }
}

async function accept(c){
  state.capture=c; state.receivedAt=performance.now(); state.candidates=[];
  conn.textContent='收到搜尋，抓取 4 張候選圖…';
  try{
    const t0=performance.now();
    state.candidates=await findCandidates(c.query);
    state.searchMs=performance.now()-t0;
    renderCandidates();
  }catch(e){
    console.error(e); conn.textContent='候選圖取得失敗';
  }
}

async function poll(){
  if(state.busy)return;
  state.busy=true;
  try{
    const c=await latest();
    conn.textContent='已連線';
    if(c){
      const k=key(c);
      if(k&&k!==state.lastKey){ state.lastKey=k; await accept(c); }
    }
  }catch(e){
    console.error(e); conn.textContent='連線失敗，重試中…';
  }finally{state.busy=false;}
}

backBtn.onclick=()=>mode('candidateView');
regenBtn.onclick=()=>{
  const i=state.selectedIndex;
  if(i<0)return;
  drawSelectedMosaic(state.candidates[i],selectedImage);
};
tileSize.onchange=regenBtn.onclick;

mode('waiting');
poll();
setInterval(poll,POLL);

// ===== v0.8.0 Continuous Mosaic Gallery =====
const galleryView=document.getElementById('galleryView');
const photoPreview=document.getElementById('photoPreview');
const openGalleryBtn=document.getElementById('openGalleryBtn');
const galleryBack=document.getElementById('galleryBack');
const importBtn=document.getElementById('importBtn');
const zoomBtn=document.getElementById('zoomBtn');
const photoPicker=document.getElementById('photoPicker');
const photoGrid=document.getElementById('photoGrid');
const galleryHelp=document.getElementById('galleryHelp');
const previewBack=document.getElementById('previewBack');
const previewImage=document.getElementById('previewImage');
const previewCount=document.getElementById('previewCount');
const prevPhoto=document.getElementById('prevPhoto');
const nextPhoto=document.getElementById('nextPhoto');

const G={photos:[], previewIndex:0, scale:1, minScale:.115, maxScale:1, lastDist:0, anchorX:.5, anchorY:.18};
let mosaicBitmap=null, mosaicTiles=[], renderRAF=0;
const TILE_COLS=42, TILE_ROWS=58, REAL_ROWS=4;

function mainMode(el){
  [waiting,candidateView,selectedView,galleryView,photoPreview].forEach(x=>x.classList.add('hidden'));
  el.classList.remove('hidden');
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function targetCandidate(){
  return state.candidates?.[state.selectedIndex] || null;
}
async function prepareMosaic(){
  const item=targetCandidate();
  if(!item)return;
  const src=item.imageUrl || item.thumbnail;
  if(!src)return;
  const im=new Image(); im.crossOrigin="anonymous";
  await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=src});
  const sample=document.createElement('canvas');
  sample.width=TILE_COLS; sample.height=TILE_ROWS;
  const sx=sample.getContext('2d',{willReadFrequently:true});
  sx.drawImage(im,0,0,TILE_COLS,TILE_ROWS);
  const data=sx.getImageData(0,0,TILE_COLS,TILE_ROWS).data;
  mosaicTiles=[];
  for(let i=0;i<TILE_COLS*TILE_ROWS;i++){
    const p=i*4;
    mosaicTiles.push([data[p],data[p+1],data[p+2]]);
  }
  mosaicBitmap=im;
}

function buildGallery(){
  photoGrid.innerHTML='';
  photoGrid.className='continuous-gallery';
  const stage=document.createElement('div'); stage.id='galleryStage'; stage.className='gallery-stage';
  const real=document.createElement('div'); real.className='real-strip';
  G.photos.forEach((src,i)=>{
    const b=document.createElement('button'); b.className='real-photo'; b.type='button';
    const im=document.createElement('img'); im.src=src; im.alt='';
    b.appendChild(im); b.onclick=()=>openPreview(i); real.appendChild(b);
  });
  stage.appendChild(real);

  const canvas=document.createElement('canvas'); canvas.id='mosaicPlane'; canvas.className='mosaic-plane';
  stage.appendChild(canvas);
  photoGrid.appendChild(stage);
  renderMosaicPlane();
  applyScale(false);
  galleryHelp.classList.toggle('hidden',G.photos.length>0);
}

function renderMosaicPlane(){
  const c=document.getElementById('mosaicPlane'); if(!c)return;
  const dpr=Math.min(devicePixelRatio||1,1.5);
  const tile=18, w=TILE_COLS*tile, h=TILE_ROWS*tile;
  c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';
  const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);

  // Each cell is a real-looking micro thumbnail with target-colour overlay.
  for(let r=0;r<TILE_ROWS;r++)for(let col=0;col<TILE_COLS;col++){
    const i=r*TILE_COLS+col, rgb=mosaicTiles[i]||[70,70,70];
    const px=col*tile,py=r*tile;
    // varied photo-like base; no repeated user photos
    const variant=(i*37+r*13)%7;
    x.fillStyle=`rgb(${clamp(rgb[0]+(variant-3)*5,0,255)},${clamp(rgb[1]+((variant*3)%7-3)*4,0,255)},${clamp(rgb[2]+((variant*5)%7-3)*4,0,255)})`;
    x.fillRect(px,py,tile-1,tile-1);
    // subtle internal shapes make nearby cells read as individual thumbnails at medium scale
    x.globalAlpha=.16;
    x.fillStyle=variant%2?'white':'black';
    if(variant%3===0)x.fillRect(px+2,py+2,tile-5,Math.max(2,tile*.28));
    else {x.beginPath();x.arc(px+tile*.55,py+tile*.43,tile*.23,0,Math.PI*2);x.fill();}
    x.globalAlpha=1;
  }
}

function applyScale(animate=true){
  const stage=document.getElementById('galleryStage'); if(!stage)return;
  stage.style.transition=animate?'transform 110ms linear':'none';
  stage.style.transform=`scale(${G.scale})`;
  // compensate layout height so page scroll remains usable while zooming
  photoGrid.style.height=(stage.scrollHeight*G.scale)+'px';
  zoomBtn.textContent=G.scale>.23?'縮小':'放大';
}
function setScale(v,animate=false){
  G.scale=clamp(v,G.minScale,G.maxScale); applyScale(animate);
}

photoPicker.onchange=()=>{
  G.photos.forEach(u=>{if(u.startsWith('blob:'))URL.revokeObjectURL(u)});
  G.photos=[...photoPicker.files].map(f=>URL.createObjectURL(f));
  G.scale=1;buildGallery();
};
importBtn.onclick=()=>photoPicker.click();
zoomBtn.onclick=()=>setScale(G.scale>.23?Math.max(G.minScale,G.scale*.58):Math.min(1,G.scale*1.72),true);
openGalleryBtn.onclick=async()=>{
  try{await prepareMosaic()}catch(e){console.warn(e)}
  G.scale=1;buildGallery();mainMode(galleryView);
};
galleryBack.onclick=()=>mainMode(selectedView);

function openPreview(i){
  if(!G.photos.length)return;
  G.previewIndex=i;updatePreview();mainMode(photoPreview);
}
function updatePreview(){
  const n=G.photos.length;if(!n)return;
  G.previewIndex=(G.previewIndex+n)%n;
  previewImage.src=G.photos[G.previewIndex];
  previewCount.textContent=`${G.previewIndex+1} / ${n}`;
}
previewBack.onclick=()=>{buildGallery();mainMode(galleryView)};
prevPhoto.onclick=()=>{G.previewIndex--;updatePreview()};
nextPhoto.onclick=()=>{G.previewIndex++;updatePreview()};
let swipeX=0;
previewImage.addEventListener('touchstart',e=>{if(e.touches.length===1)swipeX=e.touches[0].clientX},{passive:true});
previewImage.addEventListener('touchend',e=>{
  const x=e.changedTouches[0]?.clientX??swipeX,d=x-swipeX;
  if(Math.abs(d)>45){G.previewIndex+=d<0?1:-1;updatePreview()}
},{passive:true});

// True continuous pinch: scale follows finger distance, no discrete mode switching.
photoGrid.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    const a=e.touches[0],b=e.touches[1];
    G.lastDist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  }
},{passive:false});
photoGrid.addEventListener('touchmove',e=>{
  if(e.touches.length!==2)return;
  e.preventDefault();
  const a=e.touches[0],b=e.touches[1];
  const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  if(G.lastDist){
    const ratio=d/G.lastDist;
    G.scale=clamp(G.scale*ratio,G.minScale,G.maxScale);
    if(!renderRAF)renderRAF=requestAnimationFrame(()=>{renderRAF=0;applyScale(false)});
  }
  G.lastDist=d;
},{passive:false});
photoGrid.addEventListener('touchend',()=>{G.lastDist=0},{passive:true});
