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


// ===== v0.7.0 Gallery Prototype =====
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

const galleryState={photos:[],zoom:0,previewIndex:0,pinchStart:0};
const galleryModes=['zoom-normal','zoom-mid','zoom-small','zoom-mosaic'];

function mainMode(el){
  [waiting,candidateView,selectedView,galleryView,photoPreview].forEach(x=>x.classList.add('hidden'));
  el.classList.remove('hidden');
}

function renderGallery(){
  photoGrid.className='photo-grid '+galleryModes[galleryState.zoom];
  photoGrid.innerHTML='';
  const photos=galleryState.photos;
  photos.forEach((src,i)=>{
    const b=document.createElement('button');
    b.type='button'; b.className='gallery-photo';
    const im=document.createElement('img'); im.src=src; im.alt='';
    b.appendChild(im);
    b.onclick=()=>openPreview(i);
    photoGrid.appendChild(b);
  });

  // Fill a few rows visually when the user has only selected a small number of photos.
  if(photos.length && galleryState.zoom<3){
    const target=galleryState.zoom===0?30:galleryState.zoom===1?55:90;
    for(let i=photos.length;i<target;i++){
      const b=document.createElement('button');
      b.type='button'; b.className='gallery-photo clone';
      const im=document.createElement('img'); im.src=photos[i%photos.length]; im.alt='';
      b.appendChild(im);
      b.onclick=()=>openPreview(i%photos.length);
      photoGrid.appendChild(b);
    }
  }

  if(galleryState.zoom===3){
    photoGrid.innerHTML='';
    const c=document.createElement('canvas');
    c.className='gallery-mosaic';
    photoGrid.appendChild(c);
    const item=state.candidates[state.selectedIndex];
    if(item && selectedImage.complete && selectedImage.naturalWidth){
      buildMosaicFromImage(selectedImage,c,3.5);
    }else if(item?.mosaicData){
      const im=new Image(); im.onload=()=>{
        c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);
      }; im.src=item.mosaicData;
    }
  }

  galleryHelp.classList.toggle('hidden',photos.length>0);
  zoomBtn.textContent=galleryState.zoom<3?'縮小':'放大';
}

function cycleZoom(){
  galleryState.zoom = galleryState.zoom<3 ? galleryState.zoom+1 : 0;
  renderGallery();
}

photoPicker.onchange=()=>{
  galleryState.photos.forEach(u=>{if(u.startsWith('blob:'))URL.revokeObjectURL(u)});
  galleryState.photos=[...photoPicker.files].map(f=>URL.createObjectURL(f));
  galleryState.zoom=0;
  renderGallery();
};
importBtn.onclick=()=>photoPicker.click();
zoomBtn.onclick=cycleZoom;
openGalleryBtn.onclick=()=>{galleryState.zoom=0;renderGallery();mainMode(galleryView)};
galleryBack.onclick=()=>mainMode(selectedView);

function openPreview(i){
  if(!galleryState.photos.length)return;
  galleryState.previewIndex=i;
  updatePreview();
  mainMode(photoPreview);
}
function updatePreview(){
  const n=galleryState.photos.length;
  if(!n)return;
  galleryState.previewIndex=(galleryState.previewIndex+n)%n;
  previewImage.src=galleryState.photos[galleryState.previewIndex];
  previewCount.textContent=`${galleryState.previewIndex+1} / ${n}`;
}
previewBack.onclick=()=>mainMode(galleryView);
prevPhoto.onclick=()=>{galleryState.previewIndex--;updatePreview()};
nextPhoto.onclick=()=>{galleryState.previewIndex++;updatePreview()};

// Swipe single-photo preview
let swipeX=0;
previewImage.addEventListener('touchstart',e=>{if(e.touches.length===1)swipeX=e.touches[0].clientX},{passive:true});
previewImage.addEventListener('touchend',e=>{
  const x=e.changedTouches[0]?.clientX??swipeX, d=x-swipeX;
  if(Math.abs(d)>45){galleryState.previewIndex+=d<0?1:-1;updatePreview()}
},{passive:true});

// Pinch gesture on gallery: one pinch step changes one density level.
photoGrid.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    const a=e.touches[0],b=e.touches[1];
    galleryState.pinchStart=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  }
},{passive:true});
photoGrid.addEventListener('touchend',e=>{
  if(galleryState.pinchStart && e.touches.length<2){
    // touchend no longer exposes both points reliably; use gesture direction from last move.
    galleryState.pinchStart=0;
  }
},{passive:true});
let pinchLast=0;
photoGrid.addEventListener('touchmove',e=>{
  if(e.touches.length!==2)return;
  const a=e.touches[0],b=e.touches[1];
  const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  if(!pinchLast)pinchLast=d;
  const delta=d-pinchLast;
  if(Math.abs(delta)>34){
    if(delta<0 && galleryState.zoom<3)galleryState.zoom++;
    if(delta>0 && galleryState.zoom>0)galleryState.zoom--;
    pinchLast=d; renderGallery();
  }
},{passive:true});
photoGrid.addEventListener('touchend',()=>{pinchLast=0},{passive:true});
