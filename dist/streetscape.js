import * as THREE from './three.module.js';
import {mergeGeometries} from './BufferGeometryUtils.js';
export function buildStreetscape(city,elev,textureFactory){
 const group=new THREE.Group();group.name='Mapped streetscape';const bins=new Map();
 const mats={iron:new THREE.MeshStandardMaterial({color:'#334239',roughness:.63,metalness:.45}),wood:new THREE.MeshStandardMaterial({color:'#88745a',roughness:.96}),concrete:new THREE.MeshStandardMaterial({color:'#b3aea0',map:textureFactory('stone'),roughness:.97}),pavers:new THREE.MeshStandardMaterial({color:'#b49b84',map:textureFactory('brick'),roughness:.98}),paint:new THREE.MeshStandardMaterial({color:'#d6d0b6',roughness:.98}),bulb:new THREE.MeshStandardMaterial({color:'#e7dfba',emissive:'#ffe4a6',emissiveIntensity:.15,roughness:.4}),red:new THREE.MeshStandardMaterial({color:'#673a25',roughness:.83}),leaf:new THREE.MeshStandardMaterial({color:'#677445',roughness:.96})};
 function add(g,key){if(!bins.has(key))bins.set(key,[]);bins.get(key).push(g)}
 function block(key,x,y,z,w,h,d,a=0){const g=new THREE.BoxGeometry(w,h,d);g.rotateY(a);g.translate(x,y,z);add(g,key)}
 function cylinder(key,x,y,z,r1,r2,h){const g=new THREE.CylinderGeometry(r1,r2,h,10);g.translate(x,y,z);add(g,key)}
 const roads=city.roads.filter(r=>['trunk','secondary','tertiary','residential','unclassified'].includes(r.kind)).flatMap(r=>r.p.slice(1).map((b,i)=>({a:r.p[i],b,name:r.name,oneway:r.oneway})));
 const nearest=(p)=>{let best=null;for(const r of roads){const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],l=dx*dx+dz*dz;if(l<1)continue;const t=THREE.MathUtils.clamp(((p[0]-r.a[0])*dx+(p[1]-r.a[1])*dz)/l,0,1),d=Math.hypot(p[0]-r.a[0]-t*dx,p[1]-r.a[1]-t*dz);if(!best||d<best.d)best={...r,d,angle:-Math.atan2(dz,dx),dx:dx/Math.sqrt(l),dz:dz/Math.sqrt(l)}}return best};
 let objects=0,crossings=0,plazas=0;
 for(const r of [...city.roads.filter(r=>r.area&&['pedestrian','footway'].includes(r.kind)&&r.p.length>3),...(city.plazas||[])]){
  const shape=new THREE.Shape(r.p.map(p=>new THREE.Vector2(p[0],-p[1])));for(const h of r.holes||[])shape.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],-p[1]))));const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,elev(x,z)+.16);g.attributes.uv.setXY(i,x/2.4,z/2.4)}g.computeVertexNormals();add(g,'pavers');plazas++;
 }
 for(const o of city.furniture||[]){const [x,z]=o.p,y=elev(x,z),r=nearest(o.p),a=r?.angle||0;objects++;
  if(o.kind==='bench'){
   for(let i=0;i<5;i++){block('wood',x,y+.48,z+(i-2)*.095,1.65,.055,.074,a);block('wood',x,y+.68+i*.055,z-.28,1.65,.046,.065,a)}
   for(const s of [-1,1]){block('iron',x+s*.57,y+.24,z,.055,.46,.5,a);block('iron',x+s*.68,y+.60,z,.045,.3,.47,a)}
  }else if(o.kind==='bicycle_parking'){
   for(let k=0;k<2;k++){const g=new THREE.TorusGeometry(.35,.035,6,12,Math.PI);g.rotateY(a);g.translate(x+k*.9,y+.55,z);add(g,'iron');for(const s of [-1,1])cylinder('iron',x+k*.9+s*.35,y+.28,z,.034,.034,.56)}
  }else if(o.kind==='waste_basket'){
   cylinder('iron',x,y+.45,z,.3,.26,.9);cylinder('iron',x,y+.92,z,.33,.33,.06);for(let i=0;i<12;i++){const t=i*Math.PI/6;block('concrete',x+Math.cos(t)*.295,y+.48,z+Math.sin(t)*.295,.018,.67,.018)}
  }else if(o.kind==='street_lamp'){
   cylinder('iron',x,y+.20,z,.2,.25,.4);cylinder('iron',x,y+2.35,z,.06,.13,4.6);cylinder('iron',x,y+4.55,z,.39,.1,.1);cylinder('bulb',x,y+4.25,z,.25,.13,.55);cylinder('iron',x,y+4.67,z,.06,.45,.16);
  }else if(o.kind==='traffic_signals'){
   cylinder('iron',x,y+2.2,z,.07,.11,4.4);block('iron',x,y+3.4,z,.33,.95,.29,a);for(let i=0;i<3;i++){const g=new THREE.SphereGeometry(.10,8,6);g.scale(1,1,.25);g.translate(x,y+3.7-i*.3,z+.16);add(g,i===2?'leaf':'red')}
  }else if(o.kind==='crossing'&&r&&r.d<8&&o.crossing!=='unmarked'){
   const w=r.name.includes('College')?(r.oneway?8.5:18):9;
   for(let k=-w/2+1;k<w/2-.5;k+=1.2){const xx=x-r.dz*k,zz=z+r.dx*k;block('paint',xx,elev(xx,zz)+.167,zz,2.5,.012,.48,a)}crossings++;
  }else if(o.kind==='drinking_water'){cylinder('iron',x,y+.47,z,.12,.17,.94);cylinder('metal',x,y+.96,z,.22,.15,.06)}
 }
 // Reconstruct the mapped Mason Street railway, in its real corridor. Scenario
 // streetcar rails are a separate layer on College Avenue.
 for(const r of city.railways||[]){for(let i=0;i<r.p.length-1;i++){const p=r.p[i],q=r.p[i+1],dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz);if(len<.1)continue;for(let d=0;d<len;d+=.8){const x=p[0]+dx*d/len,z=p[1]+dz*d/len;block('wood',x,elev(x,z)+.06,z,2.45,.1,.18,-Math.atan2(dz,dx)+Math.PI/2)}for(const s of [-.72,.72]){const x=(p[0]+q[0])/2-dz/len*s,z=(p[1]+q[1])/2+dx/len*s;block('iron',x,elev(x,z)+.15,z,len,.12,.08,-Math.atan2(dz,dx))}}}
 for(const p of city.paving||[]){
  const sh=new THREE.Shape(p.p.map(q=>new THREE.Vector2(q[0],-q[1])));for(const h of p.holes)sh.holes.push(new THREE.Path(h.map(q=>new THREE.Vector2(q[0],-q[1]))));const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,elev(x,z)+.23);g.attributes.uv.setXY(i,x/2.4,z/2.4)}g.computeVertexNormals();add(g,'concrete');
  for(const ring of [p.p,...p.holes])for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1],ya=elev(...a),yb=elev(...b);const edge=new THREE.BufferGeometry();edge.setAttribute('position',new THREE.Float32BufferAttribute([a[0],ya+.05,a[1],b[0],yb+.05,b[1],b[0],yb+.23,b[1],a[0],ya+.05,a[1],b[0],yb+.23,b[1],a[0],ya+.23,a[1]],3));edge.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,.2,0,0,1,.2,0,.2],2));edge.computeVertexNormals();add(edge,'concrete')}
 }
 const meshes=[];for(const [k,gs]of bins){const geometry=mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g));gs.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,mats[k]||mats.iron);mesh.name=k;mesh.castShadow=k!=='paint'&&k!=='pavers';mesh.receiveShadow=true;group.add(mesh);meshes.push(mesh)}
 return {group,meshes,stats:{mappedObjects:objects,crossings,plazas}};
}
