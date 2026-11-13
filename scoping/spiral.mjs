// Builds scoping/SPIRAL.md: all states ordered outward from Missouri, with MEASURED FHWA HPMS counts (hpms-scan.json)
// and the native state endpoints found/probed so far. Run: node scoping/hpms-scan.mjs && node scoping/spiral.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const hp = Object.fromEntries(JSON.parse(readFileSync(join(dir, 'hpms-scan.json'), 'utf8')).map(r => [r.state, r]));

const C = { AL:[32.8,-86.8],AK:[64.2,-152.5],AZ:[34.3,-111.7],AR:[34.9,-92.4],CA:[37.2,-119.5],CO:[39.0,-105.5],CT:[41.6,-72.7],DE:[39.0,-75.5],FL:[28.6,-82.4],GA:[32.7,-83.4],HI:[20.8,-156.3],ID:[44.4,-114.6],IL:[40.0,-89.2],IN:[39.9,-86.3],IA:[42.1,-93.5],KS:[38.5,-98.4],KY:[37.5,-85.3],LA:[31.1,-92.0],ME:[45.3,-69.0],MD:[39.0,-76.8],MA:[42.3,-71.8],MI:[44.3,-85.4],MN:[46.3,-94.3],MS:[32.7,-89.7],MO:[38.4,-92.5],MT:[47.0,-109.6],NE:[41.5,-99.8],NV:[39.3,-116.6],NH:[43.7,-71.6],NJ:[40.2,-74.7],NM:[34.4,-106.1],NY:[42.9,-75.5],NC:[35.5,-79.4],ND:[47.5,-100.5],OH:[40.3,-82.8],OK:[35.6,-97.5],OR:[43.9,-120.6],PA:[40.9,-77.8],RI:[41.7,-71.5],SC:[33.9,-80.9],SD:[44.4,-100.2],TN:[35.8,-86.3],TX:[31.5,-99.3],UT:[39.3,-111.7],VT:[44.1,-72.7],VA:[37.5,-78.8],WA:[47.4,-120.5],WV:[38.6,-80.6],WI:[44.6,-89.9],WY:[43.0,-107.5] };
const km = (a, b) => { const r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

// native endpoints: status from live probes (v = verified responding with AADT fields; p = partial; x = failed/blocked; ? = not located)
const N = {
  MO: ['v', 'mapping.modot.mo.gov BusinessInt/TrafficInfoSegAADT MapServer, layers 16-19 (4 directions), 1999-2025, ~75k segs/yr, lanes/truck%/class/speed. BUILT.'],
  KS: ['p', 'kanplan.ksdot.gov Transportation/AADT_Flow_Map FeatureServer/0 (5,066 lines, one count year)'],
  NE: ['p', 'giscat.ne.gov AnnualAverageDailyTraffic MapServer/0 (points, ADT_YEAR, truck ADT)'],
  OK: ['p', 'services6.arcgis.com/RBtoEUQ2lmN0K3GY AADT_Network (14,150 lines, AADT + previous; owner unconfirmed)'],
  IA: ['p', 'gis.iowadot.gov Systems_Planning/ICE FeatureServer (36.5k lines, total + truck split, one year)'],
  IL: ['p', 'services2.arcgis.com/aIrBD8yn1TDTEXoz ADT_COMP_2020Dissolved (90,374 lines, 2020 only)'],
  KY: ['p', 'services2.arcgis.com/CcI36Pduqd0OR4W9 Traffic_Section_Middle_Third (20,526 lines, one third of state)'],
  TN: ['p', 'services.arcgis.com/IYrj3otxNjPsrTRD HistoricTrafficData_3 (sections 2016-2022, ~4.9k/yr; owner unconfirmed)'],
  AR: ['v', 'ARDOT own server gis.ardot.gov/referenced/rest/services/SIR_TIS: Road_Inventory_OnSystem/2 (226,311 sections: lanes, shoulders, medians, pavement, ADT) + ADTLinear/0 (12,961 count stations, ADT per year 1986-2025 with truck %). Native build: build-data.ts --ardot'],
  MI: ['x', 'mdotgis.state.mi.us MdotAadtCaadt2024 requires a token'],
  WV: ['v', 'gis.transportation.wv.gov Projects/AADT FeatureServer/2 (41,652 segments, Year_Recorded)'],
  ID: ['v', 'gis.itd.idaho.gov ArcGISOnline/AADTLayers MapServer (one layer per year 1999-present, ~10k lines/yr, monthly ADT)'],
  VA: ['v', 'services.arcgis.com/p5v98VHDX9Atv3l7 VDOTTrafficVolume FeatureServer/0 (121,679 lines)'],
  MD: ['v', 'mdgeodata.md.gov MD_AnnualAverageDailyTraffic MapServer/0-1 (10.7k lines + 8.8k points, AADT_2010..)'],
  NY: ['x', 'gis.dot.ny.gov Traffic_Monitoring MapServer "not started"'],
  CA: ['p', 'geodata.dot.ca.gov chhighway/Traffic_AADT FeatureServer/0 (14,080 points, not lines)'],
  IN: ['v', 'gis.indot.in.gov RAH_GIO_Collaboration/LRSE_AADT MapServer/33 (lines, HPMS_YEAR)'],
  MT: ['x', 'app.mdt.mt.gov Standard/Traffic MapServer returned HTTP 503 (retry)'],
  NV: ['x', 'gis.dot.nv.gov TRINA_AADT_ROUTEEVENTS: featureserver extension not found'],
  LA: ['v', 'maps.dotd.la.gov Hosted/LARH_RH_AADT FeatureServer/0 (10,915 lines, datayear)'],
  CO: ['p', 'services.arcgis.com/yzB9WM8W0BO3Ql7d TrafficData (3,269 state-highway lines)'],
  WI: ['p', 'services5.arcgis.com/0pgGLzT0Nh7FVjon TCMap_Traffic_Count_Sites (27,138 points)'],
  OH: ['v', 'tims.dot.state.oh.us StandardMaps/AADT_StandardMaps MapServer/0-2 (159,012 lines, 3 scale tiers)'],
  TX: ['x', 'no statewide TxDOT AADT service found; only a Travis County mirror and 2015 saturation counts; HPMS only'],
  NM: ['v', 'services.arcgis.com/hOpd7wfnKm16p9D9 TrafficSection_2023/2024 + Trafficv2 (2025): one service per year, ~78k lines each, AADT + truck split'],
  WY: ['x', 'no public WYDOT GIS REST for traffic: WYDOT publishes PDF books and Excel (2025 VMB.xlsx); its Interactive Transportation System Map (apps.wyoroad.info/itsm) exposes no REST listing; WyDOT_Highways_OpenData has 351 highway lines with no AADT; HPMS has 81,915 sections with AADT'],
  SD: ['v', 'sdgis.sd.gov dot/TIM/HR49_GisADT MapServer/0 (2,736 state-trunk segments, Adt01-Adt10 = ten years per row, layer 1 = truck ADT); DOT_TrafficCountLoc for non-trunk counts'],
  MN: ['v', 'services.arcgis.com/8df8p0NlLFEShl0r AADTMN FeatureServer/0 (37,923 lines, hosted copy; MnDOT Traffic Forecasting contact). dotapp9 MNDOT_TRAFFIC_DATA not found'],
  NC: ['v', 'services.arcgis.com/NuWFvHYDMVmmxMeM NCDOT_AADT_Traffic_Segmentation: layers 1-3 segments (47k lines) + layer 0 stations (48,938 points, AADT_2002..2021)'],
  AL: ['x', 'no ALDOT AADT REST layer found (aldotgis.dot.state.al.us GeoGISProjects not checked for traffic); HPMS only'],
  AZ: ['x', 'ADOT publishes AADT as annual PDFs and a dashboard; a hosted HPMS_2023/2024_Data service exists on services6.arcgis.com but its owner is unclear (the same service surfaced for Arkansas); HPMS only'],
  UT: ['p', 'central.udot.utah.gov Hosted/Local_Average_Annual_Daily_Traffic_AADT (estimated local roads only, not probed); state-highway AADT is on the UDOT open portal (URL not located)'],
  ND: ['x', 'only the NDDOT Travel Map dynamic service (not for heavy use) and a TEST HPMS layer; HPMS only'],
  PA: ['p', 'PASDA-hosted PennDOT traffic counts (mapservices.pasda.psu.edu, layer "Pa Traffic 2026_01"); not probed, layer id unconfirmed'],
  SC: ['x', 'SCDOT offers CSV/PDF downloads and a Drakewell viewer; no ArcGIS REST AADT layer found'],
  WA: ['v', 'data.wsdot.wa.gov Shared/TrafficData FeatureServer: layer 1 Traffic Sections (4,815 lines) + layer 0 counts (6,615 points), ReportingYear; state highways only'],
  OR: ['p', 'gis.odot.state.or.us transgis/catalog MapServer/155 AADT-State (6,544 points, truck split); non-state layer 156 on test host only'],
  NJ: ['p', 'services.arcgis.com/HggmsDF7UJsNN1FK AADT2016FT (3,945 lines, AADT_2009..2021 columns; owner unconfirmed)'],
  DE: ['v', 'enterprise.firstmap.delaware.gov Transportation/DE_Assets FeatureServer/10 "TRAFFIC COUNTS LAST 10 YEARS" (4,134 lines: CURRENT_AADT + AADT_LAST_YEAR_1..9, YEAR_LAST_COUNTED); same server has DE_Public_Crash_Data and DE_Roadways_Main/Other'],
  VT: ['v', 'maps.vtrans.vermont.gov Layers/AADT MapServer: AADT Limited (744 lines) + AADT Other (2,573 lines), Year field'],
  NH: ['p', 'maps.dot.nh.gov Highways/NHDOT_HIGHWAYS_Districts_Roads MapServer responds (200); AADT, AADT_CURR_YEAR fields reported by search, layer id not probed'],
  MA: ['x', 'no MassDOT AADT REST service found; HPMS only'],
  CT: ['p', 'CTDOT AADT referenced by an HDR layer as services1.arcgis.com/FCaUeJ5SOVtImake/ArcGIS/rest/services/AADT/FeatureServer (CTDOT\'s own org; not yet probed here)'],
  ME: ['x', 'no MaineDOT AADT REST service found; HPMS only'],
  RI: ['x', 'no RIDOT AADT REST service found; HPMS only'],
  MS: ['p', 'Geometry is official: MDOT road centerlines (linear referencing, Nov 2025, ~292k segments keyed by SRI + MP_START/MP_END) published by MARIS (Univ. of Mississippi) at gis.mississippi.edu/server/rest/services/Transportation/MS_MDOTLRM_Nov25/MapServer (layers 4-10 by route class). No traffic fields there. Attributes/ADT: HDR Inc. copy of the 2019 MDOT RCI (services.arcgis.com/04HiymDgLlsbhaV4 Mississippi_RCI; owner an HDR Inc. account, static, created 2025-01) keyed by the same SRI + BEGINMILE/ENDMILE: layer 3 RC_AADT_2019 has ADT_11..ADT_21, lanes (P_NMBRTHRU), shoulders, medians, surface. The same HDR org\'s AADT/Truck_AADT layers are FLORIDA data. Latest AADT: MDOT Traffic Count Application downloads (mdot.ms.gov/applications/trafficcounters), not REST. Plan: join RCI to MARIS geometry on SRI+mileposts'],
  GA: ['x', 'only an inclement-weather counter service found; HPMS only'],
  FL: ['x', 'gis.fdot.gov RCI_Layers returned HTTP 403'],
};
let disc = {}, orgs = {};
try { disc = Object.fromEntries(JSON.parse(readFileSync(join(dir, 'discovered.json'), 'utf8')).map(r => [r.state, r])); } catch {}
try { orgs = Object.fromEntries(JSON.parse(readFileSync(join(dir, 'org-sweep.json'), 'utf8')).map(r => [r.state, r])); } catch {}
const dotOwner = /dot|kytc|tpp_traf|\bmdt\b|trafficsurvey|dotd|udot|wvdot|oklahoma/i;
const found = s => { const d = disc[s]; const live = (d?.probed ?? []).filter(p => p.layers.length); const off = live.find(p => dotOwner.test(p.owner)) ?? live[0]; const srv = (orgs[s]?.servers ?? []).map(v => new URL(v.root).host).join(', ');
  // account names are deliberately left out of the notes (personal handles)
  return [off ? `Found: ${off.title} ${off.url}` : '', srv ? `DOT servers: ${srv}` : ''].filter(Boolean).join(' | '); };
const status = { v: 'verified', p: 'partial', x: 'failed', '?': 'not yet located' };

// Rings = border-hop distance from Missouri (BFS over state adjacency); within a ring, clockwise starting due south at Arkansas.
const ADJ = {AL:'FL GA MS TN',AZ:'CA NV UT NM CO',AR:'LA MS MO OK TN TX',CA:'AZ NV OR',CO:'AZ KS NE NM OK UT WY',CT:'MA NY RI',DE:'MD NJ PA',FL:'AL GA',GA:'AL FL NC SC TN',ID:'MT NV OR UT WA WY',IL:'IN IA KY MO WI',IN:'IL KY MI OH',IA:'IL MN MO NE SD WI',KS:'CO MO NE OK',KY:'IL IN MO OH TN VA WV',LA:'AR MS TX',ME:'NH',MD:'DE PA VA WV',MA:'CT NH NY RI VT',MI:'IN OH WI',MN:'IA ND SD WI',MS:'AL AR LA TN',MO:'AR IL IA KS KY NE OK TN',MT:'ID ND SD WY',NE:'CO IA KS MO SD WY',NV:'AZ CA ID OR UT',NH:'MA ME VT',NJ:'DE NY PA',NM:'AZ CO OK TX UT',NY:'CT MA NJ PA VT',NC:'GA SC TN VA',ND:'MN MT SD',OH:'IN KY MI PA WV',OK:'AR CO KS MO NM TX',OR:'CA ID NV WA',PA:'DE MD NJ NY OH WV',RI:'CT MA',SC:'GA NC',SD:'IA MN MT ND NE WY',TN:'AL AR GA KY MS MO NC VA',TX:'AR LA NM OK',UT:'AZ CO ID NM NV WY',VT:'MA NH NY',VA:'KY MD NC TN WV',WA:'ID OR',WV:'KY MD OH PA VA',WI:'IL IA MI MN',WY:'CO ID MT NE SD UT'};
const hop = { MO: 0 }; const queue = ['MO'];
while (queue.length) { const c = queue.shift(); for (const n of ADJ[c].split(' ')) if (!(n in hop)) { hop[n] = hop[c] + 1; queue.push(n); } }
const bearing = (a, b) => { const r = x => x * Math.PI / 180, y = Math.sin(r(b[1] - a[1])) * Math.cos(r(b[0])), x = Math.cos(r(a[0])) * Math.sin(r(b[0])) - Math.sin(r(a[0])) * Math.cos(r(b[0])) * Math.cos(r(b[1] - a[1])); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
const home = C.MO, startB = bearing(home, C.AR);
const cw = s => (bearing(home, C[s]) - startB + 360) % 360; // 0 = Arkansas, increasing clockwise (S -> W -> N -> E)
const ring = d => d.hop;
const rows = Object.keys(C).filter(s => s !== 'MO').map(s => ({ s, hop: hop[s] ?? 99, a: cw(s), d: km(home, C[s]) }))
  .sort((x, y) => x.hop - y.hop || (x.hop === 99 ? x.d - y.d : x.a - y.a));
rows.unshift({ s: 'MO', hop: 0, a: 0, d: 0 });
const kb = r => (r.rows * 170) / 1e6; // every section is kept (geometry for all), not just those with AADT

let md = `# Spiral scope: Missouri outward, clockwise from Arkansas (measured)\n\nRing = number of state borders crossed from Missouri (AK/HI last). Within a ring the order runs clockwise starting due south at Arkansas: AR, OK, KS, NE, IA, IL, KY, TN, then outward. HPMS counts come from FHWA's hosted services on geo.dot.gov (\`scoping/hpms-scan.mjs\`), measured, not estimated.\nSize column = latest-year Parquet at ~170 B per row for ALL rows with delta-varint geometry (measured: AR 200 B/row, MO 139, OK 110) (every section's geometry is kept; HPMS builds use where=1=1) (AR measured).\n\nNative state endpoints were probed live (\`scoping/arcgis-probe.mjs\`); "?" means no search/probe yet.\n\n`;
md += `| # | Ring | State | HPMS years | Rows (all) | Rows w/ AADT | Est. MB (latest yr) | Native source | Notes |\n|---|---|---|---|---|---|---|---|---|\n`;
let tot = 0, totAll = 0;
let idx = 0;
for (const { s, hop: hh } of rows) {
  const h = hp[s]; const n = N[s] ?? ['?', ''];
  tot += h?.aadtRows ?? 0; totAll += h?.rows ?? 0;
  md += `| ${idx++} | ${hh === 99 ? 'far' : hh} | ${s} | ${h ? h.years.join(', ') : '-'} | ${h?.rows?.toLocaleString() ?? '-'} | ${h?.aadtRows?.toLocaleString() ?? '-'} | ${h ? kb(h).toFixed(0) : '-'} | ${status[n[0]]} | ${[n[1], found(s)].filter(Boolean).join(' || ')} |\n`;
}
const by = k => Object.values(N).filter(x => x[0] === k).length;
md += `\n## Totals\n- States + DC + PR in HPMS: ${Object.keys(hp).length}; all 50 states present.\n- Sections with AADT, latest year: **${tot.toLocaleString()}** of ${totAll.toLocaleString()} (all rows).\n- Latest-year Parquet keeping every section: **~${(totAll * 170 / 1e9).toFixed(1)} GB** (only those with AADT: ~${(tot * 170 / 1e9).toFixed(1)} GB). Five yearly snapshots would be ~${(totAll * 170 * 5 / 1e9).toFixed(0)} GB, but HPMS section ids do not stay stable across years, so multi-year history needs state-native sources.\n- Native sources probed: ${by('v')} verified, ${by('p')} partial (points only, one year or part of a state), ${by('x')} failed/blocked; ${Object.keys(C).length - Object.keys(N).length} states not yet searched.\n- Missouri native build (not HPMS): see the build log; 1999-2025 history available, 10 years built.\n`;
writeFileSync(join(dir, 'SPIRAL.md'), md);
console.log(md.split('\n').slice(0, 24).join('\n'));
