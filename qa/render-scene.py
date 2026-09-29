"""Render exported source geometry using native EGL for visual inspection.
Independent PBR lighting; browser-specific shaders and runtime remain separate tests.
"""
import os
os.environ['PYOPENGL_PLATFORM']='egl'
import sys,json,math,pathlib
import numpy as np
np.infty=np.inf  # Compatibility for pyrender 0.1.45 with NumPy 2.
import pyrender
from PIL import Image
P=pathlib.Path(sys.argv[1]);data=json.load(open(P/'scene.json'))
scene=pyrender.Scene(bg_color=[.64,.73,.78,1],ambient_light=[.3,.32,.34])
textures={}
def read(d,cols=None):
 if d is None:return None
 a=np.fromfile(P/d['file'],dtype=d['type']);return a.reshape(-1,cols) if cols else a
for mi,m in enumerate(data['meshes']):
 if os.environ.get('QA_GROUND_ONLY') and mi:continue
 pos=read(m['position'],3);normal=read(m['normal'],3);uv=read(m['uv'],2);idx=read(m['index'])
 tex=None
 if m.get('texture'):
  key=m['texture'];key+=(str(m.get('clamp')))
  if key not in textures:
   im=np.array(Image.open(P/m['texture']).convert('RGBA'));sampler=pyrender.Sampler(wrapS=33071 if m.get('clamp') else 10497,wrapT=33071 if m.get('clamp') else 10497);textures[key]=pyrender.Texture(source=im,source_channels='RGBA',sampler=sampler)
  tex=textures[key]
 material=pyrender.MetallicRoughnessMaterial(baseColorFactor=np.array(m['color']+[1.0],dtype=np.float32),baseColorTexture=tex,metallicFactor=m['metalness'],roughnessFactor=m['roughness'],doubleSided=True,alphaMode='MASK' if m.get('alphaTest') else 'OPAQUE',alphaCutoff=m.get('alphaTest',.5))
 poses=np.array(m['instances'],dtype=np.float32).reshape(-1,4,4).transpose(0,2,1) if m.get('instances') else None
 # Native instancing does not support per-instance colors; average source color
 # retains representative material only. The browser retains every tree variation.
 colors=m.get('instanceColors')
 if colors:
  color=np.array(colors).reshape(-1,3).mean(0);material.baseColorFactor=np.r_[np.array(m['color'])*color,1]
 prim=pyrender.Primitive(positions=pos,normals=normal,texcoord_0=uv,indices=idx,material=material,poses=poses)
 scene.add(pyrender.Mesh([prim]),pose=np.array(m['matrix']).reshape(4,4).T)
print('Loaded',len(data['meshes']),'meshes',flush=True)
def look(pos,target):
 p=np.array(pos,dtype=float);f=p-np.array(target);f/=np.linalg.norm(f);right=np.cross([0,1,0],f);right/=np.linalg.norm(right);up=np.cross(f,right);M=np.eye(4);M[:3,:3]=np.column_stack([right,up,f]);M[:3,3]=p;return M
scene.add(pyrender.DirectionalLight(color=[1,.94,.84],intensity=3.0),pose=look([-500,800,300],[0,0,0]))
scene.add(pyrender.DirectionalLight(color=[.72,.84,1],intensity=.35),pose=look([500,500,-500],[0,0,0]))
terrain=json.load(open(P/'terrain.json'));E=np.array(terrain['elevation']).reshape(terrain['size'],terrain['size']);sx=111320*math.cos(math.radians(40.5877));x0=(-105.088+105.0768)*sx;x1=(-105.068+105.0768)*sx;z0=(40.5877-40.593)*111320;z1=(40.5877-40.580)*111320
def ground(x,z):
 i=round((x-x0)/(x1-x0)*(len(E)-1));j=round((z-z0)/(z1-z0)*(len(E)-1));return float(E[j,i]-1517)
views={'aerial':([350,260,400],[65,10,-25]),'northern':([-14,ground(-14,-43)+1.75,-43],[18,ground(18,-90)+7,-90]),'linden':([115,ground(115,-24)+1.75,-24],[115,ground(115,-70)+8,-70]),'square':([35,ground(35,67)+1.75,67],[64,ground(64,42)+7.0,42]),'college':([-23,ground(-23,322)+1.75,322],[-61,ground(-61,354)+6.5,354])}
r=pyrender.OffscreenRenderer(1400,900);cam=pyrender.PerspectiveCamera(yfov=np.deg2rad(58),znear=.15,zfar=6000);node=scene.add(cam)
for name,(p,t)in views.items():
 if len(sys.argv)>2 and name not in sys.argv[2:]:continue
 scene.set_pose(node,look(p,t));im,z=r.render(scene,flags=pyrender.RenderFlags.FLAT if os.environ.get('QA_FLAT') else 0);Image.fromarray(im).save(P/(name+'.jpg'),quality=94);print('Rendered',name,flush=True)
r.delete()
