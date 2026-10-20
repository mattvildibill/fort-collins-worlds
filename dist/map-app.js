import {BASE} from './scenario.js';
import {AerialFallback} from './fallback.js';
import {setupControls,places} from './ui.js';
const $=id=>document.getElementById(id),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SX=111320*Math.cos(40.5877*Math.PI/180),SZ=111320;
const xy=(lon,lat)=>[(lon+105.0768)*SX,(40.5877-lat)*SZ];
const bounds={x0:xy(-105.088,40.593)[0],x1:xy(-105.068,40.580)[0],z0:xy(-105.088,40.593)[1],z1:xy(-105.068,40.580)[1]};
function inside(x,z,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
async function json(url){const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('City data could not load.');return response.json();}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>{image.src='';reject(Error('The aerial image took too long to load.'));},20000);image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(Error('The aerial image could not load.'));};image.src=url;});}
export async function startMap(){
 const canvas=$('scene');document.body.classList.add('aerial-fallback');canvas.setAttribute('aria-label','Downtown map. Use arrow keys or WASD to move; drag to pan and scroll to zoom.');
 let city,image,controls,scenario={...BASE},view='reality',mode='fly',labels=true,split=.5,distance=420,tour=false,tourTime=0,frame=null,last=0,dirty=true;
 const center={x:65,z:15},walk={x:65,z:15},keys=new Set(),pointers=new Map();let pinch=0;
 try{
  [city,image]=await Promise.all([json('./data/city.json'),loadImage('./data/aerial-map.webp')]);
  const renderer=new AerialFallback(canvas,{getCity:()=>city,getImage:()=>image,getCenter:()=>center,getScenario:()=>renderer.currentScenario||BASE,getMode:()=>mode,getWalkPos:()=>walk,getDistance:()=>distance,getLabels:()=>labels?Object.values(places).map(p=>({name:p.name,p:xy(p.lon,p.lat)})):[],bounds});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  function blocked(x,z){return x<bounds.x0+15||x>bounds.x1-15||z<bounds.z0+15||z>bounds.z1-15||city.buildings.some(b=>inside(x,z,b.p)&&!(b.holes||[]).some(h=>inside(x,z,h)));}
  function move(dx,dz){const p=mode==='walk'?walk:center;if(mode!=='walk'||!blocked(p.x+dx,p.z))p.x=clamp(p.x+dx,bounds.x0+15,bounds.x1-15);if(mode!=='walk'||!blocked(p.x,p.z+dz))p.z=clamp(p.z+dz,bounds.z0+15,bounds.z1-15);}
  function closeAt(x,z){if(blocked(x,z)){let nearest=null;for(const r of city.roads)for(const p of r.p){const d=Math.hypot(p[0]-x,p[1]-z);if((!nearest||d<nearest.d)&&!blocked(...p))nearest={p,d};}if(nearest)[x,z]=nearest.p;}walk.x=x;walk.z=z;}
  function minimap(){const c=$('minimap'),ctx=c.getContext('2d'),p=mode==='walk'?walk:center;ctx.drawImage(image,0,0,c.width,c.height);ctx.fillStyle='#17322155';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#edffc6';ctx.strokeStyle='#173321';ctx.lineWidth=2;ctx.beginPath();ctx.arc((p.x-bounds.x0)/(bounds.x1-bounds.x0)*c.width,(p.z-bounds.z0)/(bounds.z1-bounds.z0)*c.height,4,0,Math.PI*2);ctx.fill();ctx.stroke();$('altitude').textContent=mode==='walk'?'Map close-up':'North-up map';}
  function render(){renderer.setScissorTest(false);renderer.clear();if(view==='compare'){renderer.setScissorTest(true);renderer.setScissor(0,0,Math.floor(innerWidth*split),innerHeight);renderer.currentScenario=BASE;renderer.render();renderer.setScissor(Math.floor(innerWidth*split),0,Math.ceil(innerWidth*(1-split)),innerHeight);renderer.currentScenario=scenario;renderer.render();renderer.setScissorTest(false);}else{renderer.currentScenario=view==='reality'?BASE:scenario;renderer.render();}minimap();dirty=false;}
  function tick(ms){frame=null;const dt=Math.min((ms-last)/1000,.04);last=ms;if(document.hidden)return;
   if(keys.size){const speed=(mode==='walk'?80:distance*.8)*dt,dx=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),dz=(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);move(dx*speed,dz*speed);dirty=true;}
   if(tour){tourTime+=dt;const place=Object.values(places)[Math.floor(tourTime/12)%5],[x,z]=xy(place.lon,place.lat);center.x+=(x-center.x)*dt*.5;center.z+=(z-center.z)*dt*.5;distance+=(place.d-distance)*dt*.5;$('place-title').textContent=place.name;dirty=true;}
   if(dirty)render();if(keys.size||tour)frame=requestAnimationFrame(tick);
  }
  function invalidate(){dirty=true;if(frame===null){last=performance.now();frame=requestAnimationFrame(tick);}}
  function resize(){renderer.setSize(innerWidth,innerHeight);invalidate();}
  controls=setupControls({onScenario:s=>{scenario=s;invalidate();},onView:v=>{view=v;invalidate();},onSplit:v=>{split=v;invalidate();},onMode:m=>{mode=m;if(m==='walk')closeAt(center.x,center.z);else{center.x=walk.x;center.z=walk.z;}$('walkpad').hidden=m!=='walk';invalidate();},onPlace:key=>{const p=places[key],[x,z]=xy(p.lon,p.lat);center.x=x;center.z=z;distance=p.d;if(mode==='walk')closeAt(x,z);invalidate();},onTour:on=>{tour=on;tourTime=0;invalidate();},onLabels:on=>{labels=on;invalidate();},onPauseInput:()=>keys.clear()});
  canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}controls.stopTour();});
  canvas.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],next=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)distance=clamp(distance*pinch/next,35,1300);pinch=next;}else{const scale=(mode==='walk'?Math.max(60,distance*.8):distance*1.8)/Math.min(innerWidth,innerHeight);move((old.x-e.clientX)*scale,(old.y-e.clientY)*scale);}invalidate();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);pinch=0;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();controls.stopTour();distance=clamp(distance*Math.exp(e.deltaY*.001),35,1300);invalidate();},{passive:false});
  window.addEventListener('keydown',e=>{if($('about').open||['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY'].includes(document.activeElement.tagName))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){e.preventDefault();keys.add(key);controls.stopTour();invalidate();}});
  window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();else invalidate();});window.addEventListener('resize',resize);
  document.querySelectorAll('[data-move]').forEach(button=>{const key={forward:'w',back:'s',left:'a',right:'d'}[button.dataset.move];button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(key);invalidate();});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(key));});
  $('minimap').onclick=e=>{const r=e.target.getBoundingClientRect();center.x=bounds.x0+(e.clientX-r.left)/r.width*(bounds.x1-bounds.x0);center.z=bounds.z0+(e.clientY-r.top)/r.height*(bounds.z1-bounds.z0);if(mode==='walk')closeAt(center.x,center.z);controls.stopTour();invalidate();};
  $('data-summary').textContent=`${city.buildings.length.toLocaleString()} building footprints and ${city.roads.length.toLocaleString()} street/path segments. This lightweight edition draws the same map without 3D geometry. Height estimates use 2013 LiDAR; 96 Old Town and landmark buildings remain fixed in scenarios.`;
  $('hint').textContent='Drag to pan · Scroll or pinch to zoom';$('loading').hidden=true;
  const note=document.createElement('div');note.className='fallback-note';note.textContent=new URLSearchParams(location.search).get('view')==='map'?'Map view':'Map view · 3D unavailable in this browser';document.body.append(note);
  $('walk').title='Close-up map exploration';$('walk').querySelector('span').textContent='Close up';
  const toggle=$('edition-toggle');toggle.textContent='Try 3D';toggle.href='?view=3d';resize();controls.startFromURL();
 }catch(error){console.error(error);$('loadtext').textContent=error.message||'The map could not load.';const retry=document.createElement('button');retry.className='primary';retry.textContent='Try again';retry.onclick=()=>location.reload();$('loading').append(retry);}
}
