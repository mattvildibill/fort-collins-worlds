// Choose the map before downloading Three.js or constructing any 3D meshes.
function supports3D(){
 try{const probe=document.createElement('canvas'),gl=probe.getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}
}
const map=new URLSearchParams(location.search).get('view')==='map'||!supports3D();
(map?import('./map-app.js').then(m=>m.startMap()):import('./app.js')).catch(error=>{
 console.error(error);const status=document.getElementById('loadtext');status.textContent='The city could not start. Please reload to try again.';
 const link=document.createElement('a');link.href='?view=map';link.textContent='Open the map instead';document.getElementById('loading').append(link);
});
