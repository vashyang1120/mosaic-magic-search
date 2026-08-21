
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
const backBtn=document.getElementById('backBtn');
const debug=document.getElementById('debug');
const debugText=document.getElementById('debugText');

const state={lastKey:'',capture:null,candidates:[],busy:false,receivedAt:0,searchMs:0};

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
  u.searchParams.set('count','20');
  const r=await fetch(u,{cache:'no-store',headers:{Accept:'application/json'}});
  const d=await r.json();
  if(!r.ok||!d?.ok)throw new Error(d?.error||`HTTP_${r.status}`);
  const list=(d.results||[]).filter(x=>x.thumbnail||x.imageUrl);
  return list.slice(0,4);
}

function renderCandidates(){
  queryTitle.textContent=state.capture?.query||'';
  totalTime.textContent=`候選取得 ${fmt(state.searchMs)}`;
  candidateGrid.innerHTML='';

  state.candidates.forEach((item,index)=>{
    const card=document.createElement('article');
    card.className='candidate';
    const button=document.createElement('button');
    button.type='button';
    button.innerHTML=`
      <span class="badge">${index+1}</span>
      <img alt="">
      <div class="meta">
        <div class="status loading">圖片載入中…</div>
        <div class="timing">等待 Ready</div>
        <div class="source"></div>
      </div>`;
    const img=button.querySelector('img');
    const status=button.querySelector('.status');
    const timing=button.querySelector('.timing');
    const source=button.querySelector('.source');
    source.textContent=item.source||item.title||'';

    item.ready=false;
    item.readyMs=null;
    item.displayUrl=item.thumbnail||item.imageUrl||'';

    img.onload=()=>{
      if(item.ready)return;
      item.ready=true;
      item.readyMs=elapsed();
      status.textContent='Ready';
      status.className='status ready';
      timing.textContent=`收到搜尋 → Ready：${fmt(item.readyMs)}`;
      updateTotal();
    };
    img.onerror=()=>{
      if(item.imageUrl && img.src!==item.imageUrl){
        img.src=item.imageUrl;
        return;
      }
      status.textContent='載入失敗';
      status.className='status error';
      timing.textContent='請改選其他候選圖';
      updateTotal();
    };
    img.src=item.displayUrl;

    button.onclick=()=>{
      selectedImage.src=img.currentSrc||img.src;
      selectedQuery.textContent=state.capture?.query||'';
      selectedTiming.textContent=item.ready
        ? `候選 ${index+1} 已預載完成｜Ready ${fmt(item.readyMs)}`
        : `候選 ${index+1} 尚在載入；正式版會在背景繼續準備`;
      mode('selectedView');
    };

    card.appendChild(button);
    candidateGrid.appendChild(card);
  });

  mode('candidateView');
}

function updateTotal(){
  const ready=state.candidates.filter(x=>x.ready);
  if(ready.length===state.candidates.length && ready.length){
    const max=Math.max(...ready.map(x=>x.readyMs));
    totalTime.textContent=`4/4 Ready｜${fmt(max)}`;
  }else{
    totalTime.textContent=`${ready.length}/${state.candidates.length} Ready`;
  }
  if(debugMode){
    debugText.textContent=JSON.stringify(state,null,2);
    debug.classList.remove('hidden');
  }
}

async function accept(c){
  state.capture=c;
  state.receivedAt=performance.now();
  state.candidates=[];
  conn.textContent='收到搜尋，抓取 4 張候選圖…';
  try{
    const t0=performance.now();
    state.candidates=await findCandidates(c.query);
    state.searchMs=performance.now()-t0;
    renderCandidates();
  }catch(e){
    console.error(e);
    conn.textContent='候選圖取得失敗';
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
      if(k&&k!==state.lastKey){
        state.lastKey=k;
        await accept(c);
      }
    }
  }catch(e){
    console.error(e);
    conn.textContent='連線失敗，重試中…';
  }finally{
    state.busy=false;
  }
}

backBtn.onclick=()=>mode('candidateView');
mode('waiting');
poll();
setInterval(poll,POLL);
