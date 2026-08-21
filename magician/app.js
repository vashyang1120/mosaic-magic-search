
const C=window.MOSAIC_MAGIC_CONFIG||{}, API=String(C.SEARCH_API_URL||'').replace(/\/$/,'');
const queryEl=document.getElementById('query'),conn=document.getElementById('conn'),waiting=document.getElementById('waiting'),
panel=document.getElementById('panel'),grid=document.getElementById('grid'),timing=document.getElementById('timing'),
googleBtn=document.getElementById('googleBtn'),selected=document.getElementById('selected');
let last='', current=null, start=0, busy=false;

async function jfetch(url,opt){const r=await fetch(url,opt);const d=await r.json();if(!r.ok||d.ok===false)throw Error(d.error||r.status);return d}
async function poll(){
 if(busy)return;busy=true;
 try{
  const d=await jfetch(`${API}/latest?ts=${Date.now()}`,{cache:'no-store'});conn.textContent='已連線';
  const c=d.capture;if(c){const k=(c.query||'')+'|'+(c.capturedAt||'');if(k!==last){last=k;await load(c)}}
 }catch(e){conn.textContent='重試中…'}finally{busy=false}
}
async function load(c){
 current=c;start=performance.now();queryEl.textContent=c.query;waiting.classList.add('hidden');panel.classList.remove('hidden');grid.innerHTML='';selected.classList.add('hidden');
 const d=await jfetch(`${API}/images?q=${encodeURIComponent(c.query)}`,{cache:'no-store'});
 const list=(d.results||[]).filter(x=>x.thumbnail||x.imageUrl).slice(0,4);
 list.forEach((it,i)=>{
  const b=document.createElement('button');b.className='card';b.innerHTML=`<span class="num">${i+1}</span><img crossorigin="anonymous"><div class="meta"><div class="ready">載入中…</div><div class="src"></div></div>`;
  const im=b.querySelector('img'),rd=b.querySelector('.ready');b.querySelector('.src').textContent=it.source||it.title||'';
  im.onload=()=>{rd.textContent=`Ready ${((performance.now()-start)/1000).toFixed(2)}s`};im.src=it.thumbnail||it.imageUrl;
  b.onclick=()=>choose(it,i);grid.appendChild(b);
 });
 timing.textContent=`候選取得 ${((performance.now()-start)/1000).toFixed(2)}s`;
}
async function choose(it,i){
 const target={query:current.query,imageUrl:it.imageUrl||it.thumbnail,thumbnail:it.thumbnail||it.imageUrl,title:it.title||'',source:it.source||'',selectedAt:new Date().toISOString(),candidate:i+1};
 try{
   await jfetch(`${API}/target`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(target)});
   selected.textContent=`✓ 已送到偽相簿：候選 ${i+1}`;selected.classList.remove('hidden');
 }catch(e){
   selected.textContent='Worker 尚未加入 /target。請先更新本包 worker.js。';selected.classList.remove('hidden');
 }
}
googleBtn.onclick=()=>{if(!current)return;location.href=`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(current.query)}`};
poll();setInterval(poll,Number(C.MAGICIAN_POLL_MS||1000));
