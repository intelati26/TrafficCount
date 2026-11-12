// Probes each state's portal landing URL for reachability. Usage: node scoping/probe.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const U = {
AL:'https://www.dot.state.al.us/maintenance/Traffic/',AK:'https://dot.alaska.gov/stwdplng/transdata/traffic_AADT_map.shtml',
AZ:'https://azdot.gov/planning/transportation-analysis/traffic-counts',AR:'https://www.ardot.gov/divisions/planning/',
CA:'https://dot.ca.gov/programs/traffic-operations/census',CO:'https://www.codot.gov/programs/planning/inventory-and-travel-data/traffic-data',
CT:'https://portal.ct.gov/dot',DE:'https://deldot.gov/Publications/reports/traffic_counts/',
FL:'https://tdaappsprod.dot.state.fl.us/fto/',GA:'https://gdottrafficdata.drakewell.com/',HI:'https://hidot.hawaii.gov/highways/',
ID:'https://apps.itd.idaho.gov/apps/Traffic/',IL:'https://gis-idot.opendata.arcgis.com/',IN:'https://www.in.gov/indot/',
IA:'https://iowadot.gov/maps/Data/Traffic-data',KS:'https://www.ksdot.gov/bureaus/burtransplan/maps/Traffic.asp',
KY:'https://transportation.ky.gov/Planning/Pages/Traffic-Counts.aspx',LA:'https://www.dotd.la.gov/',ME:'https://www.maine.gov/mdot/traffic/',
MD:'https://roadwaydata.mdot.maryland.gov/',MA:'https://www.mass.gov/info-details/massdot-traffic-volume-counts',MI:'https://www.michigan.gov/mdot/',
MN:'https://www.dot.state.mn.us/traffic/data/',MS:'https://mdot.ms.gov/',MO:'https://www.modot.org/traffic-volume-maps',
MT:'https://www.mdt.mt.gov/publications/datastats/',NE:'https://dot.nebraska.gov/travel/traffic-counting/',NV:'https://www.dot.nv.gov/',
NH:'https://www.nh.gov/dot/org/operations/traffic/',NJ:'https://www.nj.gov/transportation/refdata/',NM:'https://www.dot.nm.gov/',
NY:'https://www.dot.ny.gov/tdv',NC:'https://www.ncdot.gov/',ND:'https://www.dot.nd.gov/',OH:'https://www.transportation.ohio.gov/',
OK:'https://oklahoma.gov/odot.html',OR:'https://www.oregon.gov/odot/data/pages/traffic-counting.aspx',PA:'https://www.pa.gov/agencies/penndot',
RI:'https://www.dot.ri.gov/',SC:'https://www.scdot.org/',SD:'https://dot.sd.gov/',TN:'https://www.tn.gov/tdot/',TX:'https://gisdata-txdot.opendata.arcgis.com/',
UT:'https://data-uplan.opendata.arcgis.com/',VT:'https://vtrans.vermont.gov/',VA:'https://www.virginiadot.org/info/ct-TrafficCounts.asp',
WA:'https://wsdot.wa.gov/about/data',WV:'https://transportation.wv.gov/',WI:'https://wisconsindot.gov/Pages/projects/data-plan/traffic-counts/default.aspx',
WY:'https://www.dot.state.wy.us/',
};
const probe = async ([c,u]) => { try{ const r=await fetch(u,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':'traffic-archive-scoping/0.1'}}); return {c,u,status:r.status,final:r.url}; }catch(e){ return {c,u,status:'ERR',err:String(e.cause?.code||e.message)}; } };
const out=[]; const e=Object.entries(U);
for(let i=0;i<e.length;i+=10) out.push(...await Promise.all(e.slice(i,i+10).map(probe)));
writeFileSync(join(dir,'probe-results.json'),JSON.stringify(out,null,1));
const ok=out.filter(r=>r.status>=200&&r.status<400);
console.log(`reachable ${ok.length}/${out.length}`);
out.filter(r=>!(r.status>=200&&r.status<400)).forEach(r=>console.log(r.c,r.status,r.err||'',r.u));
