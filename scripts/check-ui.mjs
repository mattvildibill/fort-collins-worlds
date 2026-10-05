// Focused DOM-adapter tests; these do not claim browser/GPU verification.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/app.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
const nodes=new Map();
function node(id){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{hidden:false,textContent:'',innerHTML:'',attrs:{},classList:{toggle(k,on){if(on===undefined)on=!classes.has(k);on?classes.add(k):classes.delete(k);return on},contains:k=>classes.has(k)},setAttribute(k,v){this.attrs[k]=String(v)},removeAttribute(k){delete this.attrs[k]},focus(){this.focused=true}})}return nodes.get(id)}
const document={body:node('body')};
const helpers=source.slice(source.indexOf('function setTour('),source.indexOf('function setView('));
let accepted='';
const ui=Function('$','document','simulate',`let tour=false;${helpers};return {setTour,setImmersive,setPanelCollapsed,clearPromptError,submitScenario,isTour:()=>tour}`)(node,document,text=>{if(text==='invalid')throw Error('Try a supported change.');accepted=text});
ui.setTour(true);assert(ui.isTour());assert.equal(node('tour').attrs['aria-pressed'],'true');assert(node('tour').innerHTML.includes('Pause'));
ui.setTour(false);assert(!ui.isTour());assert.equal(node('tour').attrs['aria-pressed'],'false');assert(node('tour').innerHTML.includes('Tour'));
for(const on of [true,false,true,false]){ui.setImmersive(on);assert.equal(document.body.classList.contains('immersive'),on);assert.equal(node('focus').attrs['aria-pressed'],String(on))}
ui.setPanelCollapsed(true);assert.equal(node('collapse').attrs['aria-expanded'],'false');assert.equal(node('collapse').attrs['aria-label'],'Expand scenario panel');
ui.setPanelCollapsed(false);assert.equal(node('collapse').attrs['aria-expanded'],'true');assert.equal(node('collapse').attrs['aria-label'],'Collapse scenario panel');
ui.submitScenario('invalid');assert.equal(node('prompt').attrs['aria-invalid'],'true');assert(!node('prompt-error').hidden);assert(node('prompt').focused);
ui.clearPromptError();assert(node('prompt-error').hidden);assert.equal(node('prompt').attrs['aria-invalid'],undefined);
ui.submitScenario('More trees');assert.equal(accepted,'More trees');
const viewFunction=source.slice(source.indexOf('function setView('),source.indexOf('function setMode('));
const setView=Function('$','setImmersive','setPanelCollapsed','toast',`let hasScenario=false,view='reality';${viewFunction};return setView`)(node,ui.setImmersive,ui.setPanelCollapsed,()=>{});
ui.setImmersive(true);ui.setPanelCollapsed(true);setView('scenario');assert(!document.body.classList.contains('immersive'));assert(!node('scenario-panel').classList.contains('collapsed'));assert(node('prompt').focused);
assert.match(html,/id="scene" tabindex="0"/);assert.match(html,/aria-describedby="prompt-help prompt-error"/);assert.match(html,/id="prompt-error"[^>]*role="alert"/);assert.match(html,/aria-controls="panel-body"/);assert(!fs.readFileSync('dist/style.css','utf8').includes('@import'));
assert.match(source,/e\.key\.toLowerCase\(\)/);assert.match(fs.readFileSync('dist/portfolio-embed.js','utf8'),/\.scene-only, \.immersive/);
console.log('UI state, repeated toggle, hidden-panel recovery, inline validation, keyboard case normalization and accessible shell checks pass.');
