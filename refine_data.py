"""Enrich the geographic base. Re-run after prepare_data.py and LiDAR extraction.
Architectural proportions from referenced photographs are estimates, not surveys.
"""
import json,math,sys,xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Point,Polygon
ROOT=Path(__file__).parent;P=ROOT/'dist/data';city=json.load(open(P/'city.json'))
SX=111320*math.cos(math.radians(40.5877))
xy=lambda lon,lat:[round((lon+105.0768)*SX,2),round((40.5877-lat)*111320,2)]
polys=[Polygon(b['p']).buffer(0) for b in city['buildings']]
# Explicit landmark treatments, with source-based floor counts. Heights retain
# LiDAR-derived values where available; later buildings retain mapped heights.
landmarks={
 'Northern Hotel':dict(landmark='northern',floors=4,material='cream',cornice=True,sign=[1.0,-93],top=[5,-72.2],fallback=15.7),
 'Loomis Building':dict(landmark='loomis',floors=3,material='brick',bands=True,cornice=True,corner=[118.4,-59.1],fallback=12.9),
 'Armstrong Hotel':dict(landmark='armstrong',floors=3,material='darkbrick',awnings=True,cornice=True,fallback=12),
 'H. C. Howard Block':dict(floors=2,material='brick',cornice=True,fallback=8),
 'J. L. Hohnstein Block':dict(floors=2,material='buff',cornice=True,fallback=8),
 'Antlers Hotel Apartments':dict(floors=3,material='brick',cornice=True,fallback=11.8),
 'Carnegie Center for Creativity':dict(floors=2,material='stone',fallback=10.2),
 'Aggie Theater':dict(floors=2,material='brick',cornice=True,fallback=9.5),
 "Washington's Music Venue":dict(floors=2,material='brick',cornice=True,fallback=10.5),
 'The Elizabeth Hotel, Autograph Collection':dict(floors=5,material='buff',bands=True,fallback=17),
 'Ginger and Baker':dict(floors=2,material='cream',fallback=9),
}
for b in city['buildings']:
 core=-145<b['c'][0]<320 and -220<b['c'][1]<435
 # A conservative immutable Old Town core: scenario height effects occur outside it.
 b['arch']={'detailed':core or b['name'] in landmarks,'protected':(-135<b['c'][0]<220 and -170<b['c'][1]<175) or b['name'] in landmarks}
 if b['name'] in landmarks:
  a=landmarks[b['name']].copy();h=a.pop('fallback');b['arch'].update(a)
  if not b.get('heightSource','').startswith('LiDAR') and (not b['known'] or b['name']=='Northern Hotel'):b['h']=h;b['heightSource']='Photo-guided height estimate'
 if b['arch']['protected'] and not b['name'].startswith('The Elizabeth'):b['arch']['cornice']=True
 b['heightSource']=b.get('heightSource','OSM mapped height/floors' if b['known'] else 'Estimated massing')
# Project only actual mapped objects. Storefront coordinates are snapped to the
# nearest exterior facade of a containing building (or within 6m of one).
if len(sys.argv)>1:
 root=ET.parse(sys.argv[1]).getroot();objects=[];shops=[]
 for e in root.findall('node'):
  t={a.get('k'):a.get('v') for a in e.findall('tag')};p=xy(float(e.get('lon')),float(e.get('lat')))
  kind=t.get('amenity') if t.get('amenity') in ['bench','bicycle_parking','waste_basket','drinking_water','fountain','clock'] else t.get('highway') if t.get('highway') in ['street_lamp','crossing','traffic_signals'] else None
  if kind:objects.append({'id':int(e.get('id')),'p':p,'kind':kind,'direction':t.get('direction'),'crossing':t.get('crossing'),'name':t.get('name','')})
  if t.get('name') and (t.get('shop') or t.get('amenity') in ['restaurant','bar','pub','cafe','ice_cream','bank','theatre']):shops.append({'name':t['name'],'p':p,'address':t.get('addr:housenumber','')+' '+t.get('addr:street','')})
 for b in city['buildings']:b['frontages']=[]
 for s in shops:
  point=Point(s['p']);i=min(range(len(polys)),key=lambda i:polys[i].distance(point))
  if polys[i].distance(point)>6:continue
  b=city['buildings'][i]
  if not b['arch']['detailed']:continue
  best=None
  for j,(a,v) in enumerate(zip(b['p'],b['p'][1:])):
   dx,dz=v[0]-a[0],v[1]-a[1];ll=dx*dx+dz*dz
   if ll<9:continue
   t=max(0,min(1,((s['p'][0]-a[0])*dx+(s['p'][1]-a[1])*dz)/ll));d=math.hypot(s['p'][0]-a[0]-t*dx,s['p'][1]-a[1]-t*dz)
   if best is None or d<best[0]:best=(d,j,t)
  if best:b['frontages'].append({'name':s['name'],'edge':best[1],'t':round(best[2],3),'source':'OSM mapped business; frontage inferred'})
 city['furniture']=objects
 json.dump(shops,open(P/'businesses.json','w'),separators=(',',':'))
 # Tula's mapped building is the modern Old Town Square corner in reference photo.
 for s in shops:
  if s['name'].lower().startswith('tula'):
   i=min(range(len(polys)),key=lambda i:polys[i].distance(Point(s['p'])));b=city['buildings'][i];b['arch'].update({'landmark':'square','material':'brick','floors':3,'protected':True,'corner':min(b['p'],key=lambda p:p[0]+p[1])});b['h']=max(b['h'],11.8);b['heightSource']='Photo-guided height estimate' if not b.get('lidar') else b['heightSource']
city['metadata'].update({'facadeMethod':'Photo-guided landmark features; procedural secondary facades, dimensions estimated','streetFurniture':'Mapped OpenStreetMap nodes; exact models and orientations approximated','protectedCore':sum(bool(b['arch']['protected']) for b in city['buildings'])})
json.dump(city,open(P/'city.json','w'),separators=(',',':'));print('Protected core buildings',city['metadata']['protectedCore'],'mapped street objects',len(city.get('furniture',[])))
