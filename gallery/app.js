
const C=window.MOSAIC_MAGIC_CONFIG||{},API=String(C.SEARCH_API_URL||'').replace(/\/$/,'');
const picker=document.getElementById('picker'),add=document.getElementById('add'),minus=document.getElementById('minus'),
viewport=document.getElementById('viewport'),world=document.getElementById('world'),real=document.getElementById('real'),
canvas=document.getElementById('mosaic'),setup=document.getElementById('setup'),preview=document.getElementById('preview'),
pimg=document.getElementById('pimg'),pback=document.getElementById('pback'),prev=document.getElementById('prev'),next=document.getElementById('next');
let photos=[],pi=0,scale=1,min=.10,lastD=0,targetKey='',raf=0;
const COLS=54,ROWS=72;

add.onclick=()=>picker.click();minus.onclick=()=>setScale(scale>.22?scale*.62:Math.min(1,scale*1.65));
picker.onchange=()=>{photos.forEach(URL.revokeObjectURL);photos=[...picker.files].map(URL.createObjectURL);renderReal();setup.classList.toggle('hidden',photos.length>0)};
function renderReal(){real.innerHTML='';photos.forEach((s,i)=>{let b=document.createElement('button');b.className='real';b.innerHTML='<img>';b.querySelector('img').src=s;b.onclick=()=>openP(i);real.appendChild(b)})}
function openP(i){pi=i;updP();preview.classList.remove('hidden')}function updP(){if(!photos.length)return;pi=(pi+photos.length)%photos.length;pimg.src=photos[pi]}
pback.onclick=()=>preview.classList.add('hidden');prev.onclick=()=>{pi--;updP()};next.onclick=()=>{pi++;updP()};

async function latestTarget(){
 try{
  const r=await fetch(`${API}/target?ts=${Date.now()}`,{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok||!d.target)return;
  const k=(d.target.imageUrl||'')+'|'+(d.target.selectedAt||'');if(k!==targetKey){targetKey=k;await drawTarget(d.target.imageUrl)}
 }catch(e){}
}
async function drawTarget(src){
 const im=new Image();im.crossOrigin='anonymous';
 await new Promise((res,rej)=>{im.onload=res;im.onerror=rej;im.src=src});
 const sample=document.createElement('canvas');sample.width=COLS;sample.height=ROWS;const sx=sample.getContext('2d',{willReadFrequently:true});
 sx.drawImage(im,0,0,COLS,ROWS);const d=sx.getImageData(0,0,COLS,ROWS).data;
 // Crucial change: mosaic world is deliberately HUGE at normal scale.
 // At minimum zoom its portrait fills roughly the phone viewport instead of becoming a tiny picture.
 const tile=18,W=COLS*tile,H=ROWS*tile;canvas.width=W;canvas.height=H;canvas.style.width=W+'px';canvas.style.height=H+'px';
 const x=canvas.getContext('2d');x.clearRect(0,0,W,H);
 for(let y=0;y<ROWS;y++)for(let c=0;c<COLS;c++){let i=(y*COLS+c)*4,r=d[i],g=d[i+1],b=d[i+2],px=c*tile,py=y*tile,v=(c*17+y*29)%7;
   x.fillStyle=`rgb(${Math.max(0,Math.min(255,r+(v-3)*4))},${Math.max(0,Math.min(255,g+((v*3)%7-3)*3))},${Math.max(0,Math.min(255,b+((v*5)%7-3)*3))})`;x.fillRect(px,py,tile-1,tile-1);
   x.globalAlpha=.12;x.fillStyle=v%2?'#fff':'#000';if(v%3===0)x.fillRect(px+2,py+2,tile-5,5);else{x.beginPath();x.arc(px+10,py+8,4,0,Math.PI*2);x.fill()}x.globalAlpha=1;
 }
 // Calculate minimum zoom so the portrait width fills viewport.
 min=Math.min(.32,Math.max(.075,viewport.clientWidth/W));
}
function setScale(v){scale=Math.max(min,Math.min(1,v));if(!raf)raf=requestAnimationFrame(()=>{raf=0;world.style.transform=`scale(${scale})`})}
viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){let a=e.touches[0],b=e.touches[1];lastD=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}},{passive:false});
viewport.addEventListener('touchmove',e=>{if(e.touches.length!==2)return;e.preventDefault();let a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(lastD)setScale(scale*(d/lastD));lastD=d},{passive:false});
viewport.addEventListener('touchend',()=>lastD=0,{passive:true});
latestTarget();setInterval(latestTarget,900);
