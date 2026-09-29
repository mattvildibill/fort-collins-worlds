export const BASE={trees:30,height:1,traffic:100,time:16,season:'summer',streets:'roads',tram:false,gardens:false,future:false,historic:false,rain:false,fog:false,reclaim:false};
export function interpret(text){
 if(typeof text!=='string'||text.trim().length<3)throw new Error('Describe a change you would like to explore.');
 const p=text.toLowerCase().replace(/[’]/g,"'");const s={...BASE},changes=[],recognized=[];
 const has=(re)=>re.test(p);const set=(label,re,fn)=>{if(has(re)){fn();changes.push(label);recognized.push(re.source);return true}return false};
 set('Pedestrian streets',/car[ -]?free|no cars|without cars|cars never|ban (?:all )?cars|pedestrian|walkable|walking district|people[ -]first|remove (?:the )?(?:cars|traffic)|close.*(?:roads|streets).*traffic/,()=>{s.streets='pedestrian';s.traffic=0;s.trees=60;s.reclaim=true});
 set('Protected cycling',/cycl(?:ing|ist|e lanes)|bik(?:e|ing)|bicycle/,()=>{if(s.streets!=='pedestrian')s.streets='cycle';s.traffic=Math.min(s.traffic,40)});
 set('Tree-lined corridors',/green(?:er|ing| streets| city| district)?|more trees|tree[ -]lined|forest|canopy|rewild|lush|parks everywhere|plant.*trees|garden city|nature/,()=>{s.trees=90});
 set('Parking becomes green space',/parking.*(?:parks?|green|gardens?)|(?:replace|convert|remove).*parking|rewild|green district|car[ -]?free/,()=>{s.reclaim=true});
 set('Reduced canopy',/fewer trees|less (?:trees|vegetation)|no trees|remove.*trees|desert|drought|arid/,()=>{s.trees=5});
 set('Tram corridor',/tram|streetcar|light rail|rail transit|electric transit|transit[ -]first/,()=>{s.tram=true;if(s.streets==='roads')s.streets='transit';s.traffic=Math.min(s.traffic,35)});
 set('Rooftop gardens',/rooftop gardens?|green roofs?|roof gardens?|rooftop farms?|sustainab|eco[ -]?city/,()=>{s.gardens=true;s.trees=Math.max(s.trees,65)});
 set('Taller buildings outside the preserved core',/dense|density|high[ -]?rise|tall(?:er)?|skyscraper|vertical|megacity/,()=>{s.height=2;s.future=true});
 set('Lower buildings outside the preserved core',/low[ -]?rise|shorter buildings|lower buildings|small[ -]town/,()=>{s.height=.75});
 set('Future growth and transit',/future|futuristic|cyberpunk|sci[ -]?fi|neon|20[5-9]\d|21\d\d/,()=>{s.future=true;s.height=Math.max(s.height,1.7);s.tram=true;s.traffic=Math.min(s.traffic,40)});
 set('Historic-inspired treatment',/18\d\d|19[0-3]\d|historic|victorian|old[ -]fashioned|pre[ -]?car/,()=>{s.historic=true;s.future=false;s.height=.85;s.tram=true;s.traffic=0;s.streets='pedestrian'});
 set('Winter snow',/winter|snow|blizzard|frozen|icy/,()=>{s.season='winter'});
 set('Autumn foliage',/autumn|fall leaves|fall foliage|fall season|in fall/,()=>{s.season='autumn'});
 set('Summer foliage',/summer|spring/,()=>{s.season='summer'});
 set('Night lighting',/night|midnight|dark|neon/,()=>{s.time=22});
 set('Evening light',/evening|sunset|dusk|golden hour/,()=>{s.time=18});
 set('Morning light',/morning|sunrise|dawn/,()=>{s.time=7});
 set('Midday light',/midday|noon|daylight|sunny/,()=>{s.time=12});
 set('Rain and wet roads',/rain|storm|wet streets/,()=>{s.rain=true});
 set('Foggy atmosphere',/fog|mist|haze|smog/,()=>{s.fog=true});
 set('Less car traffic',/less traffic|fewer cars|reduce.*traffic|quiet streets/,()=>{s.traffic=20});
 set('More car traffic',/more traffic|busy traffic|traffic jam|congest|car[ -]centric|highway/,()=>{s.traffic=100;s.streets='roads'});
 // Explicit negations take precedence over descriptive matches.
 if(has(/no trams?|without (?:a )?tram|remove (?:the )?tram/)){s.tram=false;changes.push('Tram removed')}
 if(has(/no snow|without snow/)){s.season='summer';changes.push('Snow removed')}
 if(has(/no (?:tall buildings|high[ -]?rises)|keep.*building.*(?:height|same)|preserve.*(?:height|skyline)/)){s.height=1;changes.push('Existing building scale preserved')}
 if(has(/keep.*(?:traffic|cars)|retain.*cars/)&&s.streets==='pedestrian'){s.streets='roads';s.traffic=100;changes.push('Car access retained')}
 const scale=p.match(/(\d+(?:\.\d+)?)\s*(?:x|times)\s*(?:taller|height|building)/);if(scale){s.height=Math.max(.5,Math.min(3,+scale[1]));changes.push(`${s.height}× building height`)}
 const unsupported=[];
 if(s.height!==1)unsupported.push('Old Town core and landmark geometry is preserved; height changes apply outside it.');
 if(has(/sea level|flood|tsunami|underwater/))unsupported.push('Flooding requires a hydrologic model and is not simulated.');
 if(has(/earthquake|tornado|wildfire|fire damage|hurricane/))unsupported.push('Disaster damage and structural physics are not simulated.');
 if(has(/flying cars|spaceship|alien|zombie|dinosaur/))unsupported.push('Custom creatures, vehicles and invented objects are not supported.');
 if(has(/subway|underground|metro station/))unsupported.push('Underground infrastructure is not modeled.');
 if(has(/solar/))unsupported.push('Solar panels and energy output are not modeled.');
 if(!changes.length)throw new Error(unsupported.join(' ')||'I could not map that request to supported changes. Try describing streets, traffic, trees, building height, seasons or lighting.');
 return {state:s,changes:[...new Set(changes)],notes:unsupported,text:text.trim(),historic:s.historic};
}
