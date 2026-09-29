"""Derive conservative roof heights and ground from public 2013 USGS LiDAR.
Usage: python derive_lidar.py path/to/clipped-COPC-npz-directory
The crop is reproducible with COPC query at 1.5 m resolution, EPSG:26913.
Buildings postdating the flight require newer mapped or photo-based estimates.
"""
import sys,json,math
from pathlib import Path
import numpy as np
from pyproj import Transformer
from shapely.geometry import Polygon
from shapely import contains_xy
from scipy.spatial import cKDTree
P=Path(__file__).parent/'dist/data';C=json.load(open(P/'city.json'));SX=111320*math.cos(math.radians(40.5877));S=Path(sys.argv[1])
allpts=[]
tr=Transformer.from_crs(26913,4326,always_xy=True)
for file in S.glob('*.npz'):
 d=np.load(file);good=np.isin(d['classification'],[1,2]);lon,lat=tr.transform(d['x'][good],d['y'][good]);allpts.append(np.column_stack([(lon+105.0768)*SX,(40.5877-lat)*111320,d['z'][good],d['classification'][good]]))
a=np.concatenate(allpts);g=a[a[:,3]==2];kdt=cKDTree(g[:,:2]);roofs=a[a[:,3]==1];rdt=cKDTree(roofs[:,:2]);print('Points',len(a),'ground',len(g),flush=True)
x0=(-105.088+105.0768)*SX;x1=(-105.068+105.0768)*SX;z0=(40.5877-40.593)*111320;z1=(40.5877-40.580)*111320
n=257;xx,zz=np.meshgrid(np.linspace(x0,x1,n),np.linspace(z0,z1,n));query=np.column_stack([xx.ravel(),zz.ravel()]);dist,ids=kdt.query(query,k=8);w=1/np.maximum(dist,.25)**2;grid=(g[ids,2]*w).sum(1)/w.sum(1)
# Outside coverage, preserve the pre-existing 3DEP surface instead of extending a slope.
old=json.load(open(P/'terrain.json'));oldE=np.array(old['elevation']).reshape(old['size'],old['size']);from scipy.ndimage import map_coordinates
v=np.linspace(0,old['size']-1,n);fallback=map_coordinates(oldE,np.array(np.meshgrid(v,v,indexing='ij')).reshape(2,-1),order=1)
grid=np.where(dist[:,0]<25,grid,fallback);terrain={'size':n,'elevation':np.round(grid,2).tolist(),'source':'USGS South Platte River 2013 LiDAR, ground classification; older 3DEP outside coverage','bounds':C['bounds']};json.dump(terrain,open(P/'terrain.json','w'),separators=(',',':'))
def ground(p):
 d,ids=kdt.query(p,k=8);w=1/np.maximum(d,.25)**2;return float((g[ids,2]*w).sum()/w.sum())
count=0;measure=[]
for b in C['buildings']:
 poly=Polygon(b['p'],b.get('holes',[])).buffer(-1.0);cx,cz=b['c'];rad=max(math.hypot(p[0]-cx,p[1]-cz)for p in b['p'])+1;ids=rdt.query_ball_point([cx,cz],rad)
 if not ids or poly.is_empty:continue
 pts=roofs[ids];pts=pts[contains_xy(poly,pts[:,0],pts[:,1])];base=ground(b['c']);heights=pts[:,2]-base;heights=heights[(heights>2.4)&(heights<65)]
 if len(heights)<12:continue
 bins=np.floor(heights*2).astype(int);unique,freq=np.unique(bins,return_counts=True);mode=unique[freq.argmax()]/2+.25;cluster=heights[abs(heights-mode)<1.6]
 if len(cluster)<max(10,len(heights)*.35):continue
 h=float(np.percentile(cluster,80));density=len(heights)/max(b['area'],1)
 if density<.06:continue
 b['lidar']={'roofHeight':round(h,1),'samples':len(heights),'captureYear':2013,'spread':round(float(np.percentile(cluster,90)-np.percentile(cluster,10)),2)}
 # Keep explicit mapped height where a newer structure conflicts with the old flight.
 if b['known'] and abs(b['h']-h)>3:continue
 if b['name'] in ['The Elizabeth Hotel, Autograph Collection','Ginger and Baker'] or 'Firehouse Alley Parking'==b['name']:continue
 # The landmark count reflects photos; low roof matches must not erase them.
 floorcount=b.get('arch',{}).get('floors',0)
 if floorcount and h<floorcount*2.8:continue
 b['h']=round(h,1);b['heightSource']='LiDAR roof estimate (USGS, 2013)';count+=1;measure.append({'id':b['id'],'name':b['name'],'height':b['h'],'samples':len(heights)})
# Keep aerial canopy candidates only where high returns support a canopy.
trees=[]
for t in C['trees']:
 ids=rdt.query_ball_point(t[:2],3.5)
 if len(ids)<5:continue
 h=float(np.percentile(roofs[ids,2],85)-ground(t[:2]))
 if 3.2<h<27:trees.append([t[0],t[1],round(h,1)])
C['trees']=trees;C['metadata'].update({'lidarHeights':count,'lidarCapture':'2013','lidarMethod':'1.5 m COPC sampling; inward-buffered footprint dominant roof cluster; mapped heights retained for conflicting later structures','treeMethod':'Aerial/OSM canopy candidates, filtered and height-adjusted using LiDAR','terrainResolution':'257 × 257 ground-classified LiDAR grid (~6 m)'})
json.dump(C,open(P/'city.json','w'),separators=(',',':'));json.dump(measure,open(P/'height-evidence.json','w'),separators=(',',':'));print('Height upgrades',count,'trees',len(trees));print([(b['name'],b['h'],b.get('lidar'))for b in C['buildings']if b['name'] in ['Northern Hotel','Loomis Building','Armstrong Hotel','Aggie Theater']])
