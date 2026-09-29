"""Carve inferred sidewalks around road intersections, never across carriageways."""
import json
from pathlib import Path
from shapely.geometry import LineString,Polygon,box
from shapely.ops import unary_union
P=Path(__file__).parent/'dist/data';C=json.load(open(P/'city.json'));road=[];walk=[];paths=[]
arterial={'trunk','primary','secondary','tertiary','residential','unclassified','tertiary_link','secondary_link','trunk_link'}
for r in C['roads']:
 if r['area'] or len(r['p'])<2:continue
 l=LineString(r['p'])
 if r['kind']in arterial:
  w=(8.5 if r['oneway'] else 18)if'College'in r['name']else 7.5 if r['kind']=='residential'else 10
  road.append(l.buffer(w/2,cap_style=2,join_style=2));walk.append(l.buffer(w/2+2.5,cap_style=2,join_style=2))
 elif r['kind']=='service':road.append(l.buffer(2.25,cap_style=2,join_style=2))
 elif r['kind']in['path','footway','pedestrian','cycleway']:paths.append(l.buffer(1,cap_style=2,join_style=2))
roads=unary_union(road);buildings=unary_union([Polygon(b['p']).buffer(.1)for b in C['buildings']]);clip=box(-940,-580,740,850)
sidewalk=unary_union(walk+paths).difference(roads).difference(buildings).intersection(clip)
polys=list(sidewalk.geoms) if sidewalk.geom_type=='MultiPolygon' else[sidewalk]
# Densify long boundaries to follow the ground elevations at roughly 4m intervals.
polys=[p.segmentize(4)for p in polys if p.area>.5]
C['paving']=[{'p':[[round(x,2),round(z,2)]for x,z in p.exterior.coords],'holes':[[[round(x,2),round(z,2)]for x,z in h.coords]for h in p.interiors]}for p in polys]
C['metadata']['pavementMethod']='Road-width inferred sidewalk polygons, cut at carriageways and building boundaries; mapped plaza outline'
json.dump(C,open(P/'city.json','w'),separators=(',',':'));print('Paving polygons',len(polys))
