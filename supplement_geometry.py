import json,sys,math,xml.etree.ElementTree as E
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import polygonize,unary_union
P=Path(__file__).parent/'dist/data';j=json.load(open(P/'city.json'));r=E.parse(sys.argv[1]).getroot();nodes={e.get('id'):[float(e.get('lon')),float(e.get('lat'))]for e in r.findall('node')};ways={e.get('id'):e for e in r.findall('way')};sx=111320*math.cos(math.radians(40.5877));xy=lambda p:[round((p[0]+105.0768)*sx,2),round((40.5877-p[1])*111320,2)]
w=ways['171974036'];p=[xy(nodes[n.get('ref')])for n in w.findall('nd')];o=Polygon(p);b=max(j['buildings'],key=lambda b:Polygon(b['p']).intersection(o).area);b['arch'].update({'landmark':'square','floors':3,'protected':True,'corner':[52.3,51.8]});b['name']='1 Old Town Square';b['h']=max(b['h'],11.8);b['frontages']=[s for s in b['frontages'] if s['name']!='Tula']+[{'name':'Tula','edge':3,'t':.5,'source':'DDA address and 2024 photograph'}]
for rel in r.findall('relation'):
 if rel.get('id')!='4603792':continue
 outer=[];inner=[]
 for m in rel.findall('member'):
  if m.get('type')!='way':continue
  w=ways.get(m.get('ref'))
  if w is not None:(inner if m.get('role')=='inner' else outer).append(LineString([xy(nodes[n.get('ref')])for n in w.findall('nd')]))
 geoms=list(polygonize(unary_union(outer)));holes=list(polygonize(unary_union(inner)))
 j['plazas']=[{'name':'Old Town Square','p':list(map(list,p.exterior.coords)),'holes':[list(map(list,h.exterior.coords))for h in holes if p.contains(h)],'source':'OSM relation 4603792'}for p in geoms]
osm=json.load(open(P/'osm.json'))['elements'];conv=lambda a:xy([a['lon'],a['lat']]);j['railways']=[{'p':[conv(p)for p in e['geometry']],'kind':e['tags']['railway']}for e in osm if e['type']=='way' and e['tags'].get('railway') in ['rail','light_rail']]
json.dump(j,open(P/'city.json','w'),separators=(',',':'));print('Plazas',len(j.get('plazas',[])),'rails',len(j['railways']),'Old Town Square building',b['id'])
