
const cfg=window.MOSAIC_MAGIC_CONFIG||{};
const API=String(cfg.SEARCH_API_URL||'').replace(/\/$/,'');
const POLL=Number(cfg.MAGICIAN_POLL_MS||1000);
const debugMode=new URLSearchParams(location.search).get('debug')==='1';

const waiting=document.getElementById('waiting'),cue=document.getElementById('cue'),stealth=document.getElementById('stealth');
const conn=document.getElementById('conn'),cueImg=document.getElementById('cueImg'),cueQuery=document.getElementById('cueQuery'),cueSource=document.getElementById('cueSource');
const hideBtn=document.getElementById('hideBtn'),refreshBtn=document.getElementById('refreshBtn'),showBtn=document.getElementById('showBtn');
const debug=document.getElementById('debug'),debugText=document.getElementById('debugText');
const state={lastKey:'',capture:null,image:null,busy:false};

function mode(name){[waiting,cue,stealth].forEach(x=>x.classList.add('hidden'));document.getElementById(name).classList.remove('hidden')}
function key(c){return `${c?.query||''}|${c?.capturedAt||''}`}

async function latest(){
  const r=await fetch(`${API}/latest?ts=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}});
  const d=await r.json(); if(!r.ok||!d?.ok)throw new Error(d?.error||`HTTP_${r.status}`); return d.capture||null;
}
async function findImage(q){
  const u=new URL(`${API}/images`);u.searchParams.set('q',q);u.searchParams.set('count','12');
  const r=await fetch(u,{cache:'no-store',headers:{Accept:'application/json'}});
  const d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||`HTTP_${r.status}`);
  const list=(d.results||[]).filter(x=>x.thumbnail||x.imageUrl);
  return list[0]||null;
}
function render(){
  cueQuery.textContent=state.capture?.query||'';
  cueSource.textContent=state.image?.source||'';
  cueImg.onerror=()=>{if(state.image?.thumbnail&&cueImg.src!==state.image.thumbnail)cueImg.src=state.image.thumbnail};
  cueImg.src=state.image?.imageUrl||state.image?.thumbnail||'';
  mode('cue');
  if(debugMode){debugText.textContent=JSON.stringify(state,null,2);debug.classList.remove('hidden')}
}
async function accept(c){
  state.capture=c;conn.textContent='收到搜尋，抓取提示圖…';
  try{state.image=await findImage(c.query)}catch(e){console.error(e);state.image=null}
  render();
}
async function poll(){
  if(state.busy)return;state.busy=true;
  try{
    const c=await latest();conn.textContent='已連線';
    if(c){const k=key(c);if(k&&k!==state.lastKey){state.lastKey=k;await accept(c)}}
  }catch(e){console.error(e);conn.textContent='連線失敗，重試中…'}
  finally{state.busy=false}
}
hideBtn.onclick=()=>mode('stealth');
showBtn.onclick=()=>render();
refreshBtn.onclick=async()=>{if(!state.capture)return;state.image=await findImage(state.capture.query);render()};
mode('waiting');poll();setInterval(poll,POLL);
