"""Conservative pitched roofs for mapped houses and rectangular low-rise residential
massings outside the downtown core. Roof form is estimated, heights remain measured.
"""
import json,math
from pathlib import Path
from shapely.geometry import Polygon
P=Path(__file__).parent/'dist/data';j=json.load(open(P/'city.json'));count=0
for b in j['buildings']:
 if b['arch']['protected'] or b['h']>10:continue
 residential=b['kind'] in ['house','residential','detached','semidetached_house'] or (b['c'][0]<-320 and 60<b['area']<310)
 if not residential:continue
 poly=Polygon(b['p']).buffer(0);rect=poly.minimum_rotated_rectangle
 if rect.area>b['area']*1.16:continue
 pp=list(rect.exterior.coords)[:-1];edges=[math.dist(pp[i],pp[(i+1)%4])for i in range(4)];i=edges.index(max(edges));q=[pp[(i+k)%4]for k in range(4)]
 b['arch']['roof']={'corners':[[round(x,2),round(y,2)]for x,y in q],'rise':round(min(2.6,max(1.2,edges[(i+1)%4]*.24)),2),'source':'Estimated pitched roof form'};b['arch']['material']='siding';b['kind']='residential';count+=1
j['metadata']['pitchedRoofs']=count;j['metadata']['imageryExport']='4096 × 3498';json.dump(j,open(P/'city.json','w'),separators=(',',':'));print('Pitched roof forms',count)
