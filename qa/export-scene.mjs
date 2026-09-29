// Native geometric QA: executes the same world-building functions, without a browser.
// Lighting is independently rendered; this is not a substitute for WebGL runtime QA.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import * as THREE from '../dist/three.module.js';import {mergeGeometries} from '../dist/BufferGeometryUtils.js';
import {BASE} from '../dist/scenario.js';
import {makeReconstruction,makeSurfaceTexture} from '../dist/reconstruction.js';import {buildStreetscape} from '../dist/streetscape.js';
const req=createRequire(path.resolve(process.env.QA_NODE_ROOT||'.','package.json'));const {createCanvas,loadImage}=req('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(512,512),getElementById:()=>null};globalThis.matchMedia=()=>({matches:false});
const baseline=process.argv.includes('--baseline');const getSource=f=>baseline?execFileSync('git',['show',(process.env.QA_BASELINE_REV||'31f7d1cb131e57d0bc25afc6f1fc4abd958db50e')+':'+f],{encoding:'utf8'}):fs.readFileSync(f,'utf8');
const out=process.argv[2]||'qa/output';fs.mkdirSync(out,{recursive:true});
const city=JSON.parse(getSource('dist/data/city.json')),terrain=JSON.parse(getSource('dist/data/terrain.json'));const aerial=await loadImage('dist/data/aerial.jpg');
let source=getSource('dist/app.js').replace(/^import .*;$/gm,'').replace(/\ninit\(\);\s*$/,'');
source+=`\ncity=inputs.city;terrain=inputs.terrain;image=inputs.image;scene=new THREE.Scene();\nconst tex=new THREE.Texture(image);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;\nconst g=new THREE.PlaneGeometry(bounds.x1-bounds.x0,bounds.z1-bounds.z0,terrain.size-1,terrain.size-1);g.rotateX(-Math.PI/2);g.translate((bounds.x0+bounds.x1)/2,0,(bounds.z0+bounds.z1)/2);for(let i=0;i<g.attributes.position.count;i++){const p=g.attributes.position;p.setY(i,elev(p.getX(i),p.getZ(i)))}g.computeVertexNormals();addMesh(g,mat('#fff',{map:tex}));makeBuildings(tex);buildRoads();${baseline?'':'streetDetails=buildStreetscape(city,elev,makeSurfaceTexture);scene.add(streetDetails.group);'}buildTrees();buildLife();camera=new THREE.PerspectiveCamera();animateLife(12,0);peopleBodies.count=peopleHeads.count=60;scene.updateMatrixWorld(true);return {scene,stats:${baseline?'{}':'architecture.stats'},bounds};`;
const result=Function('THREE','mergeGeometries','BASE','makeReconstruction','makeSurfaceTexture','buildStreetscape','inputs',source)(THREE,mergeGeometries,BASE,makeReconstruction,makeSurfaceTexture,buildStreetscape,{city,terrain,image:aerial});
const meshes=[],textures=new Map();let gi=0;
const write=(arr,name)=>{const f=`${gi}-${name}.bin`;fs.writeFileSync(path.join(out,f),Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength));return{file:f,type:arr instanceof Float32Array?'float32':arr instanceof Uint32Array?'uint32':'uint16'}};
result.scene.traverse(o=>{
 if(!o.isMesh||!o.geometry.attributes.position||!o.geometry.attributes.position.count)return;
 for(let p=o;p;p=p.parent)if(!p.visible)return;
 const g=o.geometry,m=o.material;if(Array.isArray(m)||m.isShaderMaterial)return;
 const position=g.attributes.position;if(![...position.array].every(Number.isFinite))throw Error('Nonfinite geometry '+o.name);
 // Skip hidden scenario meshes (count = 0). Instancing retains exact source geometry.
 if(o.isInstancedMesh&&o.count===0)return;
 const data={name:o.name||m.name||'mesh',position:write(position.array,'pos'),normal:g.attributes.normal?write(g.attributes.normal.array,'normal'):null,uv:g.attributes.uv?write(g.attributes.uv.array,'uv'):null,index:g.index?write(g.index.array,'index'):null,matrix:o.matrixWorld.toArray(),color:m.color?.toArray()||[1,1,1],alphaTest:m.alphaTest||0,roughness:m.roughness??.9,metalness:m.metalness||0};
 if(m.map?.image){let img=m.map.image,key=textures.get(img);if(!key){key=`texture-${textures.size}.png`;if(img===aerial){const c=createCanvas(aerial.width,aerial.height);c.getContext('2d').drawImage(img,0,0);img=c}fs.writeFileSync(path.join(out,key),img.toBuffer('image/png'));textures.set(m.map.image,key)}data.texture=key;data.clamp=m.map.wrapS===THREE.ClampToEdgeWrapping;}
 if(o.isInstancedMesh){data.instances=[];const M=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,M);data.instances.push(M.toArray())}if(o.instanceColor)data.instanceColors=Array.from(o.instanceColor.array)}
 meshes.push(data);gi++;
});fs.writeFileSync(path.join(out,'terrain.json'),JSON.stringify(terrain));fs.writeFileSync(path.join(out,'scene.json'),JSON.stringify({meshes,stats:result.stats}));console.log({meshes:meshes.length,stats:result.stats,textures:textures.size});
