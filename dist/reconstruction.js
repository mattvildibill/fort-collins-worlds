import * as THREE from './three.module.js';
import {mergeGeometries} from './BufferGeometryUtils.js';

// One deterministic geometry path is used by the interactive world and the offline
// inspection renderer. All dimensions are metres; footprint coordinates are immutable.
export function makeReconstruction({city,elev,bounds,aerial,textureFactory}) {
 const group=new THREE.Group();group.name='Geographic architecture';
 const bins=new Map(),stats={facades:0,windows:0,storefronts:0,landmarks:0,protected:0};
 const specs={
  brick:{color:'#a47a67',map:textureFactory('brick'),roughness:.96},
  darkbrick:{color:'#795546',map:textureFactory('brick'),roughness:.98},
  buff:{color:'#c8b89e',map:textureFactory('brick'),roughness:.92},
  cream:{color:'#dbd1ba',map:textureFactory('stucco'),roughness:.9},
  stone:{color:'#c7bea9',map:textureFactory('stone'),roughness:.92},
  siding:{color:'#c3c0af',map:textureFactory('siding'),roughness:.94},
  glass:{color:'#a7b6b9',map:textureFactory('glass'),metalness:.42,roughness:.2},
  shopglass:{color:'#819a9c',map:textureFactory('shopglass'),metalness:.3,roughness:.24},
  frame:{color:'#343d39',roughness:.64,metalness:.18},
  wood:{color:'#534239',roughness:.9},
  metal:{color:'#7a898c',roughness:.64,metalness:.08},
  roof:{color:'#c2c0b2',map:aerial,roughness:.96},
  roofPlain:{color:'#77766f',roughness:.97},
  redroof:{color:'#565d5a',roughness:.91},
  awning:{color:'#334e47',roughness:.95},
  awningStripe:{color:'#ffffff',map:textureFactory('awning'),roughness:.95},
  warm:{color:'#d8bf93',roughness:.7}
 };
 function add(g,key,base=0,protectedCity=false){const n=g.attributes.position.count;g.setAttribute('baseHeight',new THREE.Float32BufferAttribute(new Float32Array(n).fill(base),1));g.setAttribute('growth',new THREE.Float32BufferAttribute(new Float32Array(n).fill(protectedCity?0:1),1));if(!bins.has(key))bins.set(key,[]);bins.get(key).push(g)}
 function block(key,x,y,z,w,h,d,angle=0,base=0,protect=true){const g=new THREE.BoxGeometry(w,h,d);g.rotateY(-angle);g.translate(x,y,z);add(g,key,base,protect)}
 const roadSegs=city.roads.filter(r=>!r.area&&['trunk','primary','secondary','tertiary','residential','unclassified','pedestrian','footway'].includes(r.kind)).flatMap(r=>r.p.slice(1).map((p,i)=>[r.p[i],p]));
 function nearStreet(x,z){let best=1e9;for(const [a,b]of roadSegs){if(Math.min(a[0],b[0])-25>x||Math.max(a[0],b[0])+25<x||Math.min(a[1],b[1])-25>z||Math.max(a[1],b[1])+25<z)continue;const dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz))}return best<24}
 const inPoly=(x,z,p)=>{let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>z)!=(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])v=!v}return v};
 const colliders=[];
 for(const b of city.buildings){
  const p=b.p,y=elev(...b.c),a=b.arch||{},h=b.h-(a.roof?.rise||0),core=a.detailed??(b.c[0]>-145&&b.c[0]<320&&b.c[1]>-220&&b.c[1]<435),protect=!!a.protected;
  if(protect)stats.protected++;if(a.landmark)stats.landmarks++;
  const style=a.material||(b.kind==='house'||b.kind==='residential'?'siding':b.area>2000?'buff':b.id%4===0?'buff':b.id%3===0?'darkbrick':'brick');
  let signed=0;for(let j=0;j<p.length-1;j++)signed+=p[j][0]*p[j+1][1]-p[j+1][0]*p[j][1];
  const floors=a.floors||Math.max(1,Math.round((h-.65)/3.6)),floorHeight=(h-.55)/floors;
  for(let j=0;j<p.length-1;j++){
   const u=p[j],v=p[j+1],dx=v[0]-u[0],dz=v[1]-u[1],len=Math.hypot(dx,dz);if(len<.05)continue;
   const angle=Math.atan2(dz,dx),nx=(signed>0?dz:-dz)/len,nz=(signed>0?-dx:dx)/len;
   const mid=[(u[0]+v[0])/2,(u[1]+v[1])/2];
   // Measured brick scale, independently tiled horizontally and vertically.
   const lowA=Math.min(y,elev(...u))-.18,lowB=Math.min(y,elev(...v))-.18;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([u[0],lowA,u[1],v[0],lowB,v[1],v[0],y+h,v[1],u[0],lowA,u[1],v[0],y+h,v[1],u[0],y+h,u[1]],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,len/2.4,0,len/2.4,h/2.4,0,0,len/2.4,h/2.4,0,h/2.4],2));g.computeVertexNormals();add(g,style,y,protect);
   const part=(key,t,z,w,hh,depth,out=.04)=>block(key,u[0]+dx*t+nx*out,y+z,u[1]+dz*t+nz*out,w,hh,depth,angle,y,protect);
   if(b.area>80){part('stone',.5,h-.1,len+.12,.22,.3,.06);part(style,.5,.27,len,.5,.12,.05)}
   if(len<2.7)continue;
   const blocked=city.buildings.some(other=>other!==b&&Math.abs(other.c[0]-mid[0])<80&&Math.abs(other.c[1]-mid[1])<80&&inPoly(mid[0]+nx*.6,mid[1]+nz*.6,other.p));
   if(blocked||!nearStreet(...mid))continue;
   if(!core){
    // In the surrounding blocks, inexpensive individual glazing preserves human
    // scale without applying retail windows to houses and outbuildings.
    if(b.area>65){const bays=Math.max(1,Math.floor(len/4.5));for(let f=0;f<floors;f++)for(let k=0;k<bays;k++){const t=(k+.5)/bays;part('glass',t,f*floorHeight+floorHeight*.55,Math.min(1.35,len/bays*.55),Math.min(1.8,floorHeight*.57),.07,.05);stats.windows++}}
    continue;
   }
   stats.facades++;
   const commercial=!['house','residential','garage','garages','shed'].includes(b.kind)&&b.area>100;
   const bays=Math.max(1,Math.floor(len/(a.landmark==='northern'?2.5:commercial?3.1:3.6))),step=len/bays;
   if(commercial){
    // Individual shop bays keep glazed doors and transoms at pedestrian scale.
    const shopH=Math.min(3.55,floorHeight-.15);
    for(let k=0;k<bays;k++){const t=(k+.5)/bays,w=Math.min(step-.32,3.5);if(w<1)continue;stats.storefronts++;
     part('frame',t,shopH*.46,w,shopH*.86,.14,.10);
     part('shopglass',t,shopH*.45,w-.16,shopH*.79,.03,.185);
     part('frame',t,shopH*.45,.055,shopH*.80,.05,.212);
     part('frame',t,shopH*.73,w,.055,.055,.21);
     part('stone',t,.22,w,.36,.22,.10);
     // Door handle + recessed threshold.
     part('metal',t+.12/len,1.02,.025,.3,.04,.235);
     part('stone',t,.06,w+.2,.12,.5,.15);
    }
    part('wood',.5,shopH+.05,len-.15,.37,.16,.12);
    part('stone',.5,shopH+.31,len+.18,.16,.34,.15);
    if(a.awnings||b.id%5===0){for(let k=0;k<bays;k++){const t=(k+.5)/bays;part(a.landmark==='armstrong'?'awningStripe':'awning',t,shopH-.45,step-.22,.14,1.1,.6);part(a.landmark==='armstrong'?'awningStripe':'awning',t,shopH-.62,step-.22,.26,.1,1.12)}}
   }
   for(let f=commercial?1:0;f<floors;f++){
    const cy=f*floorHeight+floorHeight*.47,wh=Math.min(2.2,floorHeight*.66),ww=Math.min(1.4,step*.53);
    for(let k=0;k<bays;k++){const t=(k+.5)/bays;stats.windows++;
     part('frame',t,cy,ww+.12,wh+.12,.10,.055);
     part('glass',t,cy,ww,wh,.035,.122);
     part('stone',t,cy+wh/2+.09,ww+.32,.17,.22,.11);
     part('stone',t,cy-wh/2-.055,ww+.32,.13,.28,.13);
     for(const side of [-1,1])part(a.landmark==='northern'?'cream':'frame',t+side*(ww/2+.04)/len,cy,.07,wh,.13,.135);
     if(a.landmark==='northern'&&f<floors-1)part('buff',t,cy+wh/2+.55,ww*.55,.65,.06,.04);
     part('frame',t,cy,.044,wh,.08,.16);part('frame',t,cy+wh*.08,ww,.048,.08,.16);
    }
    if(a.bands)part('stone',.5,f*floorHeight+.10,len,.20,.18,.10);
   }
   if(floors>1){part('stone',.5,h-.48,len+.2,.16,.36,.12);part(style,.5,h-.30,len+.16,.16,.45,.14);part('stone',.5,h+.01,len+.33,.12,.52,.15);if(a.landmark!=='northern'&&(a.cornice||style==='darkbrick'))for(let d=.4;d<len-.3;d+=.75)part('stone',d/len,h-.72,.13,.3,.3,.12)}
   // Signs are only attached to observed, mapped business/landmark frontages.
   const signs=(b.frontages||[]).filter(s=>s.edge===j);for(const s of signs){const key='sign:'+s.name;if(!specs[key])specs[key]={map:textureFactory('sign',s.name),color:'#ffffff',roughness:.9};const t=THREE.MathUtils.clamp(s.t,.15,.85),w=Math.min(len*.75,s.width||s.name.length*.18+1.1);part(key,t,Math.min(floorHeight-.55,3.1),w,.5,.10,.22)}
  }
  const sh=new THREE.Shape(p.map(q=>new THREE.Vector2(q[0],-q[1])));for(const hole of b.holes||[])sh.holes.push(new THREE.Path(hole.map(q=>new THREE.Vector2(q[0],-q[1]))));const roof=new THREE.ShapeGeometry(sh);roof.rotateX(-Math.PI/2);roof.translate(0,y+h,0);for(let i=0;i<roof.attributes.position.count;i++){const pos=roof.attributes.position;roof.attributes.uv.setXY(i,(pos.getX(i)-bounds.x0)/(bounds.x1-bounds.x0),1-(pos.getZ(i)-bounds.z0)/(bounds.z1-bounds.z0))}add(roof,'roof',y,protect);
  if(a.roof){
   const q=a.roof.corners,[A,B,C,D]=q,r1=[(A[0]+D[0])/2,(A[1]+D[1])/2],r2=[(B[0]+C[0])/2,(B[1]+C[1])/2],top=y+b.h;
   const verts=[[A[0],y+h,A[1]],[B[0],y+h,B[1]],[C[0],y+h,C[1]],[D[0],y+h,D[1]],[r1[0],top,r1[1]],[r2[0],top,r2[1]]];
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,1,5,0,5,4,2,3,4,2,4,5,0,4,3,1,2,5].flatMap(i=>verts[i]),3));g.computeVertexNormals();g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(18*2),2));add(g,'redroof',y,protect);
  }
  // Real parapet depth, rooftop equipment and mechanical ducts, never floating.
  if(core&&b.area>250&&inPoly(...b.c,p)){block('metal',b.c[0],y+h+.55,b.c[1],3.4,1.1,2,0,y,protect);block('roofPlain',b.c[0]+1,y+h+.12,b.c[1]+1.5,1.3,.24,3,0,y,protect)}
  if(a.landmark==='loomis'){
   // The projecting upper corner bay and pointed roof are the Linden landmark's silhouette.
   const c=a.corner,baseY=y+floorHeight,HH=h-floorHeight;
   const bay=new THREE.CylinderGeometry(1.75,1.75,HH,8);bay.translate(c[0],baseY+HH/2,c[1]);add(bay,'metal',y,true);
   for(let f=1;f<floors;f++){
    for(let j=0;j<8;j++){const t=Math.PI/8+j*Math.PI/4,xx=c[0]+Math.sin(t)*1.64,zz=c[1]+Math.cos(t)*1.64;block('glass',xx,y+f*floorHeight+floorHeight*.46,zz,1.14,Math.min(3.15,floorHeight*.72),.045,-t,y,true);block('metal',xx,y+f*floorHeight+floorHeight*.46,zz,.055,3.2,.08,-t,y,true)}
    const band=new THREE.CylinderGeometry(1.9,1.9,.28,8);band.translate(c[0],y+f*floorHeight,c[1]);add(band,'metal',y,true);
   }
   const cone=new THREE.ConeGeometry(2.55,4.4,4);cone.rotateY(Math.PI/4);cone.translate(c[0],y+h+2.2,c[1]);add(cone,'redroof',y,true);
  }
  if(a.landmark==='square'){
   const c=a.corner,ang=1.166;
   block('metal',c[0],y+floorHeight*1.9,c[1],2.6,floorHeight*1.7,.7,ang,y,true);
   for(let f=1;f<3;f++){block('glass',c[0]-.42,y+f*floorHeight+floorHeight*.46,c[1]+.18,2.25,2,.035,ang,y,true);block('stone',c[0]-.42,y+f*floorHeight-.03,c[1]+.18,2.8,.15,.8,ang,y,true)}
   block('brick',c[0],y+h+.6,c[1],4.2,1.2,.45,ang,y,true);block('stone',c[0],y+h+1.25,c[1],4.4,.16,.58,ang,y,true);
   const star=new THREE.Shape();for(let k=0;k<16;k++){const t=k*Math.PI/8,r=k%2?.23:.78;const x=Math.sin(t)*r,yy=Math.cos(t)*r;if(k===0)star.moveTo(x,yy);else star.lineTo(x,yy)}star.closePath();const g=new THREE.ShapeGeometry(star);g.rotateY(-ang);g.translate(c[0],y+h+2.3,c[1]);add(g,'warm',y,true);
   specs['sign:Old Town Square']={map:textureFactory('sign','OLD TOWN SQUARE'),color:'#ffffff',roughness:.85};block('sign:Old Town Square',c[0]-.42,y+h-.2,c[1]+.18,3.2,.65,.12,ang,y,true);
  }
  if(a.landmark==='northern'){
   const c=a.sign;const key='sign:HOTEL';specs[key]={map:textureFactory('sign','H\nO\nT\nE\nL'),color:'#ffffff',roughness:.6};
   block(key,c[0]-.5,y+h-4.0,c[1],.20,6.8,1.35,0,y,true);specs['sign:NORTHERN']={map:textureFactory('sign','NORTHERN'),color:'#ffffff',roughness:.7};block('sign:NORTHERN',c[0]-.5,y+h-.3,c[1],.23,.65,2.1,0,y,true);
   for(let k=0;k<6;k++)block('cream',a.top[0]+k*4.3,y+h+.25,a.top[1],2.8,.5,.36,0,y,true);
  }
  colliders.push({...b,y,minx:Math.min(...p.map(q=>q[0])),maxx:Math.max(...p.map(q=>q[0])),minz:Math.min(...p.map(q=>q[1])),maxz:Math.max(...p.map(q=>q[1]))});
 }
 const meshes=[];
 for(const [key,geos]of bins){const geom=mergeGeometries(geos.map(g=>g.index?g.toNonIndexed():g));geos.forEach(g=>g.dispose());const material=new THREE.MeshStandardMaterial({...specs[key],side:THREE.DoubleSide});material.name=key;const mesh=new THREE.Mesh(geom,material);mesh.name=key;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);meshes.push(mesh)}
 return {group,meshes,colliders,stats};
}

export function makeSurfaceTexture(kind,label=''){
 const c=document.createElement('canvas');c.width=kind==='sign'?1024:512;c.height=kind==='sign'?(label.includes('\n')?1024:128):512;const q=c.getContext('2d');
 let seed=67;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 if(kind==='sign'){q.fillStyle='#263a34';q.fillRect(0,0,c.width,c.height);q.strokeStyle='#c6b68d';q.lineWidth=3;q.strokeRect(7,7,c.width-14,c.height-14);q.fillStyle='#e9e1c9';q.textAlign='center';q.textBaseline='middle';if(label.includes('\n')){q.font='bold 160px Georgia';label.split('\n').forEach((s,i)=>q.fillText(s,512,110+i*201))}else{q.font=`600 ${Math.min(70,1500/label.length)}px Georgia`;q.fillText(label.toUpperCase(),512,67,980)}}
 else if(kind==='awning'){q.fillStyle='#d6ccaa';q.fillRect(0,0,512,512);q.fillStyle='#2c3d3b';for(let x=0;x<512;x+=64)q.fillRect(x,0,32,512)}
 else if(kind==='glass'||kind==='shopglass'){const g=q.createLinearGradient(0,0,130,512);g.addColorStop(0,'#7f999f');g.addColorStop(.45,'#526d76');g.addColorStop(.46,'#3c4d50');g.addColorStop(1,'#182b2b');q.fillStyle=g;q.fillRect(0,0,512,512);q.fillStyle='#c5b99125';q.fillRect(55,kind==='shopglass'?290:330,125,150);q.fillRect(230,350,185,140);q.fillStyle='#101f2338';for(let i=0;i<7;i++)q.fillRect(i*81,290+r()*80,20,222);q.fillStyle='#fff7dc1b';q.fillRect(0,0,512,11)}
 else{q.fillStyle=kind==='brick'?'#b9ad9f':'#d3d0c6';q.fillRect(0,0,512,512);if(kind==='brick'){for(let y=0;y<512;y+=16)for(let x=-44;x<512;x+=48){const v=Math.round(160+r()*55);q.fillStyle=`rgb(${v},${v-7},${v-12})`;q.fillRect(x+(y%32?24:0)+1,y+1,46,14)}}else if(kind==='siding'){q.strokeStyle='#797b7560';for(let y=0;y<512;y+=27){q.beginPath();q.moveTo(0,y);q.lineTo(512,y);q.stroke()}}for(let i=0;i<22000;i++){q.fillStyle=r()>.5?'#ffffff12':'#00000012';q.fillRect(r()*512,r()*512,1+r()*2,1+r()*2)}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=kind==='sign'||kind.includes('glass')?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.anisotropy=8;return t;
}
