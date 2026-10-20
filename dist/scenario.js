export const BASE=Object.freeze({trees:30,height:1,traffic:100,time:16,season:'summer',streets:'roads',tram:false,gardens:false,future:false,historic:false,rain:false,fog:false,reclaim:false});

// Match supported features locally. Negation belongs to a clause, so rejecting a
// tram never leaves behind the street/traffic changes of an earlier tram match.
function intent(text,pattern){
 let value=null;
 for(const clause of text.split(/[,;.!?]|\b(?:but|and|except|while)\b/)){
  for(const match of clause.matchAll(new RegExp(pattern.source,'g'))){
   const before=clause.slice(0,match.index);
   value=!/\b(?:no|not|without|never|remove|avoid|don't|do not)\b(?:\s+[a-z-]+){0,5}\s*$/.test(before);
  }
 }
 return value;
}
export function describeScenario(s){
 const changes=[];
 if(s.streets==='pedestrian')changes.push('Car-free streets');
 if(s.streets==='cycle')changes.push('Protected cycling');
 if(s.streets==='transit')changes.push('Tram corridor');
 if(s.trees>BASE.trees)changes.push('More trees');else if(s.trees<BASE.trees)changes.push('Fewer trees');
 if(s.reclaim)changes.push('Parking becomes green space');
 if(s.tram&&s.streets!=='transit')changes.push('Tram');
 if(s.gardens)changes.push('Rooftop gardens');
 if(s.height!==1)changes.push(`${Number(s.height.toFixed(2))}× height outside Old Town`);
 if(s.historic)changes.push('Historic-inspired');else if(s.future)changes.push('Future-inspired');
 if(s.season==='winter')changes.push('Winter snow');else if(s.season==='autumn')changes.push('Autumn foliage');
 if(s.time!==BASE.time)changes.push(s.time<6||s.time>20?'Night':s.time>=18?'Evening':s.time<10?'Morning':'Midday');
 if(s.rain)changes.push('Rain');if(s.fog)changes.push('Fog');
 if(s.traffic!==BASE.traffic&&s.streets!=='pedestrian'&&!s.tram)changes.push(`${s.traffic}% of baseline traffic`);
 return changes;
}
export function interpret(text){
 if(typeof text!=='string'||text.trim().length<3)throw new Error('Describe a change you would like to explore.');
 const p=text.toLowerCase().replace(/[’]/g,"'"),s={...BASE},notes=[],constraints=[];
 const ask={
  pedestrian:intent(p,/\b(?:car[ -]?free|no (?:cars|traffic)|without (?:cars|traffic)|ban (?:all )?cars|pedestrian|walkable|walking district|people[ -]first|remove (?:the )?(?:cars|traffic)|close.*(?:roads|streets).*traffic)\b/),
  cycle:intent(p,/\b(?:cycling|cyclists?|cycle lanes?|bikes?|biking|bicycles?)\b/),
  trees:intent(p,/\b(?:green streets?|green city|green district|greener|greening|more trees|tree[ -]lined|trees|forest|canopy|rewild|lush|parks everywhere|garden city|nature)\b/),
  fewTrees:/\b(?:fewer trees|less (?:trees|vegetation)|no trees|remove(?: all| the)? trees|desert|drought|arid)\b/.test(p),
  reclaim:intent(p,/\b(?:parking.*(?:parks?|green|gardens?)|(?:replace|convert|remove).*parking|rewild|green district|car[ -]?free)\b/),
  tram:intent(p,/\b(?:trams?|streetcars?|light rail|rail transit|electric transit|transit[ -]first)\b/),
  gardens:intent(p,/\b(?:rooftop gardens?|green roofs?|roof gardens?|rooftop farms?|sustainable|sustainability|eco[ -]?city)\b/),
  tall:intent(p,/\b(?:dense|density)(?!\s+(?:of\s+)?(?:trees|canopy|forest))\b|\b(?:high[ -]?rise|tall(?:er)?(?: buildings)?|skyscrapers?|vertical|megacity)\b/),
  low:intent(p,/\b(?:low[ -]?rise|shorter buildings|lower buildings|small[ -]town)\b/),
  future:intent(p,/\b(?:future|futuristic|cyberpunk|sci[ -]?fi|neon|20[5-9]\d|21\d\d)\b/),
  historic:intent(p,/\b(?:18\d\d|19[0-3]\d|historic|victorian|old[ -]fashioned|pre[ -]?car)\b/),
  winter:intent(p,/\b(?:winter|snow|blizzard|frozen|icy)\b/),
  autumn:intent(p,/\b(?:autumn|fall leaves|fall foliage|fall season|in fall)\b/),
  summer:intent(p,/\b(?:summer|spring)\b/),
  night:intent(p,/\b(?:night|midnight|dark|neon)\b/),
  evening:intent(p,/\b(?:evening|sunset|dusk|golden hour)\b/),
  morning:intent(p,/\b(?:morning|sunrise|dawn)\b/),
  midday:intent(p,/\b(?:midday|noon|daylight|sunny)\b/),
  rain:intent(p,/\b(?:rain|storm|wet streets)\b/),
  fog:intent(p,/\b(?:fog|mist|haze|smog)\b/),
  fewerTraffic:intent(p,/\b(?:less traffic|fewer cars|reduce.*traffic|quiet streets)\b/),
  moreTraffic:intent(p,/\b(?:more traffic|busy traffic|traffic jam|congested|congestion|car[ -]centric|highway)\b/)
 };
 const keepHeight=/\b(?:keep|preserve|retain)\b.*\b(?:building.*(?:height|same)|height|skyline)\b/.test(p),scale=p.match(/(\d+(?:\.\d+)?)\s*(?:x|times)\s*(?:taller|height|building)/);
 if(ask.pedestrian===true){s.streets='pedestrian';s.traffic=0;s.trees=60;s.reclaim=true;}
 if(ask.cycle===true){if(s.streets!=='pedestrian')s.streets='cycle';s.traffic=Math.min(s.traffic,40);}
 if(ask.trees===true)s.trees=90;if(ask.fewTrees)s.trees=5;if(ask.trees===false&&!ask.fewTrees)s.trees=BASE.trees;
 if(/\b(?:no|without|remove)(?: all| the)? trees\b/.test(p))s.trees=0;
 if(/\b(?:not|don't|do not) remove(?: all| the)? trees\b/.test(p)){s.trees=BASE.trees;constraints.push('Current tree cover');}
 if(ask.reclaim===true)s.reclaim=true;if(/(?:keep|retain|preserve) (?:the )?parking/.test(p)){s.reclaim=false;constraints.push('Parking retained');}
 if(ask.gardens===true){s.gardens=true;s.trees=Math.max(s.trees,65);}
 if(ask.tall===true){s.height=2;s.future=true;}if(ask.low===true){s.height=.75;s.future=false;}
 if(ask.future===true){s.future=true;s.height=Math.max(s.height,1.7);if(ask.tram!==false)s.tram=true;s.traffic=Math.min(s.traffic,40);}
 if(ask.historic===true){s.historic=true;s.future=false;s.height=.85;if(ask.tram!==false)s.tram=true;s.traffic=0;s.streets='pedestrian';}
 if(ask.tram===true){s.tram=true;if(s.streets==='roads')s.streets='transit';s.traffic=Math.min(s.traffic,35);}
 if(ask.future===false)s.future=false;
 if(ask.pedestrian===false)constraints.push('Mixed traffic retained');
 if(ask.tram===false){s.tram=false;constraints.push('No tram');}
 if(ask.gardens===false){s.gardens=false;constraints.push('No rooftop gardens');}
 if(ask.tall===false||keepHeight){s.height=1;s.future=false;constraints.push('Existing building heights');}
 if(scale&&ask.tall!==false&&!keepHeight)s.height=Math.max(.5,Math.min(3,Number(scale[1])));
 if(ask.winter===true)s.season='winter';if(ask.autumn===true)s.season='autumn';if(ask.summer===true||ask.winter===false&&ask.autumn!==true)s.season='summer';
 if(ask.winter===false)constraints.push('No snow');
 if(ask.night===true)s.time=22;if(ask.evening===true)s.time=18;if(ask.morning===true)s.time=7;if(ask.midday===true)s.time=12;
 s.rain=ask.rain===true;s.fog=ask.fog===true;
 if(ask.fewerTraffic===true)s.traffic=20;
 if(ask.moreTraffic===true){s.traffic=100;s.streets='roads';}
 if(/keep.*(?:traffic|cars)|retain.*cars/.test(p)&&s.streets==='pedestrian'){s.streets='roads';s.traffic=100;}
 if(s.height!==1)notes.push('Old Town and landmark buildings stay fixed; height changes apply outside that core.');
 if(/sea level|flood|tsunami|underwater/.test(p))notes.push('Flooding requires a hydrologic model and is not simulated.');
 if(/earthquake|tornado|wildfire|fire damage|hurricane/.test(p))notes.push('Disaster damage and structural physics are not simulated.');
 if(/flying cars|spaceship|alien|zombie|dinosaur/.test(p))notes.push('Custom creatures, vehicles and invented objects are not supported.');
 if(/subway|underground|metro station/.test(p))notes.push('Underground infrastructure is not modeled.');
 if(/solar/.test(p))notes.push('Solar panels and energy output are not modeled.');
 const recognized=Object.values(ask).some(v=>v!==null&&v!==false)||Object.entries(ask).some(([k,v])=>v===false&&k!=='fewTrees')||keepHeight||!!scale;
 if(!recognized)throw new Error(notes.join(' ')||'Try a supported change: streets, traffic, trees, building height, seasons or lighting.');
 const changes=[...new Set([...describeScenario(s),...constraints])];
 if(!changes.length)changes.push('Current reconstruction retained');
 return {state:s,changes,notes,text:text.trim(),historic:s.historic};
}
