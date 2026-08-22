const C=window.MOSAIC_MAGIC_CONFIG||{},API=String(C.SEARCH_API_URL||'').replace(/\/$/,'');
const picker=document.getElementById('picker'),add=document.getElementById('add'),minus=document.getElementById('minus'),viewport=document.getElementById('viewport'),
world=document.getElementById('world'),real=document.getElementById('real'),canvas=document.getElementById('mosaic'),setup=document.getElementById('setup'),
preview=document.getElementById('preview'),pimg=document.getElementById('pimg'),pback=document.getElementById('pback'),prev=document.getElementById('prev'),next=document.getElementById('next');
let photos=[],pi=0,scale=1,minScale=.12,lastD=0,targetKey='',raf=0,mosaicTop=0;const COLS=72,ROWS=96,TILE=28;
add.onclick=()=>picker.click();minus.onclick=()=>setScale(scale>.28?scale*.62:Math.min(1,scale*1.65),true);
picker.onchange=()=>{photos.forEach(u=>{try{URL.revokeObjectURL(u)}catch(e){}});photos=[...picker.files].map(f=>URL.createObjectURL(f));renderReal();setup.classList.toggle('hidden',photos.length>0)};
function renderReal(){real.innerHTML='';photos.forEach((s,i)=>{const b=document.createElement('button');b.className='real';b.innerHTML='<img>';b.querySelector('img').src=s;b.onclick=()=>openP(i);real.appendChild(b)});requestAnimationFrame(()=>{mosaicTop=real.offsetHeight+2;applyTransform(false)})}
function openP(i){pi=i;updP();preview.classList.remove('hidden')}function updP(){if(!photos.length)return;pi=(pi+photos.length)%photos.length;pimg.src=photos[pi]}pback.onclick=()=>preview.classList.add('hidden');prev.onclick=()=>{pi--;updP()};next.onclick=()=>{pi++;updP()};
function resolveUrl(t){if(!t?.imageUrl)return null;return t.imageUrl.startsWith('/')?API+t.imageUrl:t.imageUrl}
async function latestTarget(){try{const r=await fetch(`${API}/target?ts=${Date.now()}`,{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok||!d.target)return;const k=(d.target.imageUrl||'')+'|'+(d.target.selectedAt||'');if(k!==targetKey){targetKey=k;const s=resolveUrl(d.target);if(s)await drawTarget(s)}}catch(e){console.warn(e)}}
async function drawTarget(src){const im=new Image();im.crossOrigin='anonymous';await new Promise((res,rej)=>{im.onload=res;im.onerror=rej;im.src=src});
const sample=document.createElement('canvas');sample.width=COLS;sample.height=ROWS;const sx=sample.getContext('2d',{willReadFrequently:true});sx.drawImage(im,0,0,COLS,ROWS);const d=sx.getImageData(0,0,COLS,ROWS).data;
const W=COLS*TILE,H=ROWS*TILE;canvas.width=W;canvas.height=H;canvas.style.width=W+'px';canvas.style.height=H+'px';const x=canvas.getContext('2d');x.clearRect(0,0,W,H);
for(let y=0;y<ROWS;y++)for(let c=0;c<COLS;c++){const i=(y*COLS+c)*4,r=d[i],g=d[i+1],b=d[i+2],px=c*TILE,py=y*TILE,v=(c*17+y*29)%11;
const rr=Math.max(0,Math.min(255,r+(v-5)*3)),gg=Math.max(0,Math.min(255,g+((v*3)%11-5)*2)),bb=Math.max(0,Math.min(255,b+((v*7)%11-5)*2));
x.fillStyle=`rgb(${rr},${gg},${bb})`;x.fillRect(px,py,TILE-1,TILE-1);x.globalAlpha=.11;x.fillStyle=v%2?'#fff':'#000';if(v%3===0)x.fillRect(px+3,py+3,TILE-7,6);else if(v%3===1){x.beginPath();x.arc(px+TILE*.55,py+TILE*.42,TILE*.19,0,Math.PI*2);x.fill()}else x.fillRect(px+5,py+5,TILE*.55,TILE*.48);x.globalAlpha=1}
minScale=Math.max(.07,Math.min(.26,viewport.clientWidth/W));applyTransform(false)}
function progress(){const start=.42,end=minScale*1.15;if(scale>=start)return 0;if(scale<=end)return 1;return 1-(scale-end)/(start-end)}
function applyTransform(animate=false){const p=progress(),screenH=(ROWS*TILE)*scale,desiredTop=Math.max(4,(viewport.clientHeight-screenH)/2),currentTop=mosaicTop*scale,shiftY=(desiredTop-currentTop)*p;
world.style.transition=animate?'transform 130ms ease-out':'none';world.style.transform=`translate3d(0,${shiftY}px,0) scale(${scale})`}
function setScale(v,animate=false){scale=Math.max(minScale,Math.min(1,v));if(!raf)raf=requestAnimationFrame(()=>{raf=0;applyTransform(animate)})}
viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];lastD=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}},{passive:false});
viewport.addEventListener('touchmove',e=>{if(e.touches.length!==2)return;e.preventDefault();const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(lastD)setScale(scale*(d/lastD),false);lastD=d},{passive:false});
viewport.addEventListener('touchend',()=>lastD=0,{passive:true});renderReal();latestTarget();setInterval(latestTarget,800);
