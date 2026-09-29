import json,math,random
from pathlib import Path
from PIL import Image
P=Path(__file__).parent/'dist/data'
LON,LAT=-105.0768,40.5877
SX=111320*math.cos(math.radians(LAT));SY=111320
xy=lambda lon,lat:[round((lon-LON)*SX,2),round((LAT-lat)*SY,2)]
bounds=[-105.088,40.580,-105.068,40.593]
osm=json.load(open(P/'osm.json'))['elements'];city=json.load(open(P/'buildings.geojson'))['features']
obs=[]
for e in osm:
 if e['type']=='way' and 'building'in e['tags']:
  pts=[xy(p['lon'],p['lat']) for p in e['geometry']];cx=sum(p[0] for p in pts)/len(pts);cz=sum(p[1] for p in pts)/len(pts);obs.append((cx,cz,e['tags']))
seen=set();buildings=[]
for f in city:
 gs=f['geometry']['coordinates'];gs=gs if f['geometry']['type']=='MultiPolygon' else [gs]
 for g in gs:
  pts=[xy(*p[:2]) for p in g[0]];key=tuple(sorted((round(p[0]),round(p[1])) for p in pts[:-1]))
  if key in seen:continue
  seen.add(key);area=abs(sum(pts[i][0]*pts[i+1][1]-pts[i+1][0]*pts[i][1] for i in range(len(pts)-1)))/2
  if area<18:continue
  cx=sum(p[0] for p in pts[:-1])/(len(pts)-1);cz=sum(p[1] for p in pts[:-1])/(len(pts)-1)
  nearest=min(obs,key=lambda a:(a[0]-cx)**2+(a[1]-cz)**2);tags=nearest[2] if math.hypot(nearest[0]-cx,nearest[1]-cz)<18 else {}
  h=tags.get('height');known=False
  try:
   if h:height=float(h.replace('m',''));known=True
   elif tags.get('building:levels'):height=float(tags['building:levels'])*3.4;known=True
   else:height=7.6 if area>130 else 4.2
  except:height=7.6
  if area>2200 and not known:height=13
  buildings.append({'id':f['id'],'p':pts,'holes':[[xy(*p[:2]) for p in r] for r in g[1:]],'c':[round(cx,2),round(cz,2)],'h':round(max(2.5,min(height,70)),1),'known':known,'name':tags.get('name',''),'kind':tags.get('building',f['properties'].get('building','yes')),'area':round(area)})
roads=[];parks=[];water=[];trees=[]
for e in osm:
 t=e['tags']
 if e['type']=='node' and t.get('natural')=='tree':trees.append(xy(e['lon'],e['lat'])+[6.5])
 if e['type']!='way':continue
 pts=[xy(p['lon'],p['lat']) for p in e['geometry']]
 if 'highway'in t:roads.append({'id':e['id'],'p':pts,'kind':t['highway'],'name':t.get('name',''),'area':t.get('area')=='yes','oneway':t.get('oneway')=='yes','lanes':t.get('lanes','2')})
 if t.get('leisure')=='park' or t.get('landuse') in ['grass','recreation_ground']:parks.append({'p':pts,'name':t.get('name','')})
 if t.get('waterway') in ['river','stream'] or t.get('natural')=='water':water.append({'p':pts,'area':t.get('natural')=='water'})
# Supplemental canopy candidates from aerial vegetation, not claimed as surveyed trees.
im=Image.open(P/'aerial.jpg').convert('RGB');W,H=im.size;random.seed(42)
def inside(x,z,pts):
 c=False;j=len(pts)-1
 for i in range(len(pts)):
  a,b=pts[i],pts[j]
  if ((a[1]>z)!=(b[1]>z)) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:c=not c
  j=i
 return c
for y in range(10,H-10,16):
 for x in range(10,W-10,16):
  r,g,b=im.getpixel((x,y))
  if g>r*1.09 and g>b*1.12 and 40<g<145 and random.random()<.62:
   lon=bounds[0]+x/W*(bounds[2]-bounds[0]);lat=bounds[3]-y/H*(bounds[3]-bounds[1]);px,pz=xy(lon,lat)
   if any(abs(v['c'][0]-px)<55 and abs(v['c'][1]-pz)<55 and inside(px,pz,v['p']) for v in buildings):continue
   if any(math.hypot(px-t[0],pz-t[1])<8 for t in trees):continue
   trees.append([px,pz,round(random.uniform(5,10),1)])
d={'origin':[LON,LAT],'bounds':bounds,'buildings':buildings,'roads':roads,'parks':parks,'water':water,'trees':trees,'metadata':{'buildingSource':'City of Fort Collins / Esri Community Maps, CC BY 4.0','osmSource':'OpenStreetMap contributors, ODbL','aerialSource':'USGS / USDA NAIP','terrainSource':'USGS 3DEP','compiled':'2026-09-15','heightKnown':sum(b['known'] for b in buildings),'treeMethod':'OSM points plus aerial vegetation color sampling'}}
d['parking']=json.load(open(P/'parking.json'))
json.dump(d,open(P/'city.json','w'),separators=(',',':'));print({k:len(d[k]) for k in ['buildings','roads','parks','water','trees']});print(d['metadata'])
