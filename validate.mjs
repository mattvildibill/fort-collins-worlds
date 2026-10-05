import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import assert from 'node:assert/strict';import {interpret,BASE} from './dist/scenario.js';
const data=JSON.parse(fs.readFileSync('dist/data/city.json'));assert(data.buildings.length>1500);assert(data.roads.length>1000);assert(data.buildings.every(b=>b.p.length>=4&&Number.isFinite(b.h)));const terrain=JSON.parse(fs.readFileSync('dist/data/terrain.json'));assert.equal(terrain.elevation.length,terrain.size**2);assert(terrain.elevation.every(Number.isFinite));
let r=interpret('A car-free downtown with a tram, rooftop gardens, taller buildings and snow at night');assert.equal(r.state.traffic,0);assert(r.state.tram);assert(r.state.gardens);assert(r.state.height>1);assert.equal(r.state.season,'winter');assert.equal(r.state.time,22);assert.equal(BASE.height,1);
r=interpret('More trees but no tram, preserve building heights');assert.equal(r.state.tram,false);assert.equal(r.state.height,1);assert(r.state.trees>30);
assert.throws(()=>interpret('Flood downtown'));assert.throws(()=>interpret('purple elephants'));assert.throws(()=>interpret(''));r=interpret('A green city with flood water');assert(r.notes.length>0);
const html=fs.readFileSync('dist/index.html','utf8');const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(x=>x[1]).filter(x=>!x.includes(':'));for(const p of refs)assert(fs.existsSync('dist/'+p),'Missing '+p);const jpg=fs.readFileSync('dist/data/aerial.jpg');assert.equal(jpg[0],255);assert.equal(jpg[1],216);
console.log(`Validated ${data.buildings.length} footprints, ${data.roads.length} road/path features, ${terrain.elevation.length} elevations; compositional scenarios, negation, unsupported input and static assets.`);

for(const f of ['app.js','scenario.js','fallback.js','three.core.js','three.module.js','BufferGeometryUtils.js'])execFileSync(process.execPath,['--check','dist/'+f]);
const THREE=await import('./dist/three.module.js');const source=fs.readFileSync('dist/app.js','utf8');const ribbonSource=source.slice(source.indexOf('function ribbon('),source.indexOf('function buildRoads('));const ribbon=Function('THREE','elev',ribbonSource+';return ribbon;')(THREE,()=>0);for(const p of [[[0,0],[50,0]],[[0,0],[0,50]],[[0,0],[20,-20]]]){const g=ribbon(p,8);const ns=g.attributes.normal;assert([...ns.array].every(Number.isFinite));for(let i=0;i<ns.count;i++)assert(ns.getY(i)>.99,'Road surfaces must face upward');g.dispose()}
console.log('Road orientation and finite geometry verified in all tested directions.');

// Geographic and scenario regression checks for the reconstruction upgrade.
for(const f of ['reconstruction.js','streetscape.js'])execFileSync(process.execPath,['--check','dist/'+f]);
assert(data.metadata.lidarHeights>1000);assert.equal(terrain.size,257);assert(data.furniture.length>500);assert(data.plazas.some(p=>p.name==='Old Town Square'));assert(data.paving.length>300);
const northern=data.buildings.find(b=>b.name==='Northern Hotel'),linden=data.buildings.find(b=>b.name==='Loomis Building');assert.equal(northern.arch.floors,4);assert(northern.h>12&&northern.h<18);assert.equal(linden.arch.floors,3);assert(northern.arch.protected&&linden.arch.protected);
const {makeReconstruction}=await import('./dist/reconstruction.js');const before=JSON.stringify(data.buildings.map(b=>b.p));const model=makeReconstruction({city:data,elev:()=>0,bounds:{x0:-947,x1:744,z0:-590,z1:857},aerial:null,textureFactory:()=>null});
let fixed=0,grow=0;for(const mesh of model.meshes){const p=mesh.geometry.attributes.position,g=mesh.geometry.attributes.growth,base=mesh.geometry.attributes.baseHeight;assert(g&&base);for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));if(g.getX(i)===0){fixed++;const transformed=base.getX(i)+(p.getY(i)-base.getX(i))*(1+(3-1)*g.getX(i));assert.equal(transformed,p.getY(i),'Preserved vertices must remain fixed at maximum growth')}else grow++}}
assert(fixed>50000&&grow>10000);assert.equal(JSON.stringify(data.buildings.map(b=>b.p)),before);assert(model.stats.windows>10000);assert(model.stats.landmarks>=4);
for(const scale of [.5,1,3]){const s=interpret(`${scale} times taller buildings`);assert.equal(s.state.height,scale);if(scale!==1)assert(s.notes.some(n=>n.includes('core')))}
assert(source.includes('mix(1.0,uScale,growth)'));assert(fs.readFileSync('dist/fallback.js','utf8').includes('b.arch?.protected?0:s.height-1'));
console.log(`Reconstruction checked: ${model.stats.windows} modeled windows, ${model.stats.facades} detailed facade edges; ${fixed.toLocaleString()} protected vertices remain fixed at 3× growth.`);

execFileSync(process.execPath,['scripts/check-ui.mjs'],{stdio:'inherit'});
