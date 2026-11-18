// 50-state scoping: est. size + data availability for traffic-count archiving.
// Usage: node scoping/state-scope.mjs   -> writes scoping/STATE_SCOPE.md and STATE_SCOPE.csv
// All values are ESTIMATES from general knowledge, not live-verified. See report caveats.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));

// [code, name, agency, publicRoadMilesK, tier, formats, historyYrs, classData, inRegistry, note]
// tier: A = open GIS/REST or bulk download + multi-year history
//       B = current GIS or GIS (sparse), partial history / needs scraping
//       C = mostly viewer-only or PDF-only, limited history / manual effort
const S = [
['AL','Alabama','ALDOT',101,'B','GIS',10,'Y',0,'Traffic data viewer + GIS layer'],
['AK','Alaska','DOT&PF',15,'C','PDF + viewer',10,'Partial',0,'Small network, sparse counts'],
['AZ','Arizona','ADOT',144,'B','GIS',15,'Y',0,'Multimodal Planning Division AADT'],
['AR','Arkansas','ARDOT',99,'B','GIS (PDF ignored)',15,'Y',1,'County/city PDF flow maps'],
['CA','California','Caltrans',175,'A','CSV + GIS',20,'Y',1,'Traffic Census Program, PeMS for continuous'],
['CO','Colorado','CDOT',88,'A','GIS REST + CSV',20,'Y',1,'OTIS portal'],
['CT','Connecticut','CTDOT',21,'B','GIS',10,'Partial',0,'Small'],
['DE','Delaware','DelDOT',14,'B','GIS',10,'Partial',0,'Small'],
['FL','Florida','FDOT',125,'A','GIS + CSV',20,'Y',1,'Traffic Online, TCS shapefiles'],
['GA','Georgia','GDOT',128,'A','GIS REST',15,'Y',0,'TADA portal'],
['HI','Hawaii','HDOT',4.5,'C','PDF',10,'Partial',0,'Tiny; PDF reports'],
['ID','Idaho','ITD',49,'B','GIS',10,'Y',0,''],
['IL','Illinois','IDOT',145,'A','GIS REST',20,'Y',1,'Getting Around Illinois'],
['IN','Indiana','INDOT',100,'A','GIS REST + CSV',15,'Y',1,'Traffic count database system'],
['IA','Iowa','Iowa DOT',114,'A','GIS REST + CSV',20,'Y',1,'Open data portal'],
['KS','Kansas','KDOT',140,'B','GIS (PDF ignored)',15,'Y',1,'Large rural local network'],
['KY','Kentucky','KYTC',80,'B','GIS',15,'Y',1,'Traffic counts viewer'],
['LA','Louisiana','LADOTD',61,'B','GIS',10,'Y',0,''],
['ME','Maine','MaineDOT',23,'B','GIS',10,'Y',0,'Open data'],
['MD','Maryland','MDOT SHA',32,'A','GIS REST + CSV',20,'Y',0,'Open data portal'],
['MA','Massachusetts','MassDOT',36,'B','GIS',10,'Y',0,'Road Inventory'],
['MI','Michigan','MDOT',122,'A','GIS REST + CSV',15,'Y',1,'Open data'],
['MN','Minnesota','MnDOT',140,'A','GIS REST',25,'Y',1,'Traffic mapping app'],
['MS','Mississippi','MDOT',76,'C','GIS (sparse)',10,'Partial',0,'Mostly PDF'],
['MO','Missouri','MoDOT',126,'A','PDF + GIS',20,'Y',1,'Baseline state (seeded)'],
['MT','Montana','MDT',74,'B','GIS',15,'Y',0,''],
['NE','Nebraska','NDOT',93,'B','GIS (PDF ignored)',15,'Y',1,''],
['NV','Nevada','NDOT',55,'B','GIS',10,'Y',0,''],
['NH','New Hampshire','NHDOT',16,'B','GIS',10,'Partial',0,''],
['NJ','New Jersey','NJDOT',39,'B','GIS',10,'Partial',0,'Straight line diagrams'],
['NM','New Mexico','NMDOT',69,'B','GIS',10,'Y',0,''],
['NY','New York','NYSDOT',114,'A','GIS REST + CSV',20,'Y',0,'Traffic Data Viewer'],
['NC','North Carolina','NCDOT',107,'A','GIS REST',20,'Y',0,'Open data'],
['ND','North Dakota','NDDOT',87,'B','GIS (PDF ignored)',10,'Partial',0,''],
['OH','Ohio','ODOT',125,'A','GIS REST + CSV',20,'Y',1,'TIMS'],
['OK','Oklahoma','ODOT',116,'B','GIS',15,'Y',1,''],
['OR','Oregon','ODOT',74,'A','GIS REST + CSV',20,'Y',0,'Transportation Data Section'],
['PA','Pennsylvania','PennDOT',121,'A','GIS REST + CSV',20,'Y',0,'Open data / RMS'],
['RI','Rhode Island','RIDOT',6.6,'B','GIS',10,'Partial',0,'Tiny'],
['SC','South Carolina','SCDOT',71,'B','GIS',15,'Y',0,'Traffic count data viewer'],
['SD','South Dakota','SDDOT',83,'B','GIS (PDF ignored)',10,'Partial',0,''],
['TN','Tennessee','TDOT',96,'A','GIS REST',20,'Y',1,'TDOT Traffic History'],
['TX','Texas','TxDOT',314,'A','GIS REST + CSV',20,'Y',1,'Largest network; TxDOT open data'],
['UT','Utah','UDOT',46,'A','GIS REST + CSV',20,'Y',0,'Open data'],
['VT','Vermont','VTrans',14.5,'B','GIS',10,'Partial',0,'Small'],
['VA','Virginia','VDOT',75,'A','GIS REST + CSV',20,'Y',0,'Traffic Data portal'],
['WA','Washington','WSDOT',83,'A','GIS REST + CSV',20,'Y',0,'Open data'],
['WV','West Virginia','WVDOT',38,'B','GIS',10,'Partial',0,''],
['WI','Wisconsin','WisDOT',115,'A','GIS REST',20,'Y',1,'Traffic count map'],
['WY','Wyoming','WYDOT',29,'B','GIS',10,'Y',0,''],
];

// Size model (documented assumptions):
//  counted segments  ~= publicMiles * 0.30 (state-system + sampled local; HPMS-like density)
//  GIS record w/ geometry ~= 2.5 KB. PDFs are OUT OF SCOPE (GIS + linked statistics only).
//  archive = history years * (year GIS size). Class/continuous stats add +25%.
const rows = S.map(([code,name,agency,mi,tier,fmt,hist,cls,reg,note]) => {
  const segs = Math.round(mi*1000*0.30);
  const yrMB = segs*2.5/1024;                       // one year of geometry+AADT
  const archGB = ((yrMB*hist)*(cls==='Y'?1.25:1.0))/1024;
  const eff = {A:1,B:2.5,C:5}[tier];                 // relative engineering effort
  return {code,name,agency,mi,tier,fmt,hist,cls,reg:!!reg,segs,yrMB:+yrMB.toFixed(0),archGB:+archGB.toFixed(2),eff,note};
});
const tot = k => rows.reduce((a,r)=>a+r[k],0);
const tierCt = t => rows.filter(r=>r.tier===t).length;

const csv = ['code,name,agency,public_road_miles_k,tier,formats,history_yrs,class_data,in_app_registry,est_segments,est_1yr_MB,est_archive_GB,effort_pts,note',
  ...rows.map(r=>[r.code,r.name,r.agency,r.mi,r.tier,`"${r.fmt}"`,r.hist,r.cls,r.reg,r.segs,r.yrMB,r.archGB,r.eff,`"${r.note}"`].join(','))].join('\n');
writeFileSync(join(dir,'STATE_SCOPE.csv'),csv+'\n');

const md = `# 50-State Traffic Data Scope (estimates)

Generated by \`scoping/state-scope.mjs\`. **Figures are estimates from general knowledge and a stated size model; portal URLs/formats were not live-verified.**

## Summary
- Tier A (open GIS/bulk + deep history): **${tierCt('A')}** states
- Tier B (current GIS or PDFs, partial history): **${tierCt('B')}** states
- Tier C (no GIS download found; HPMS only): **${tierCt('C')}** states
- Already in app registry: **${rows.filter(r=>r.reg).length}** of 50 (the rest need config + data)
- Est. total segments: **${(tot('segs')/1e6).toFixed(2)}M**; est. one-year national GIS: **${(tot('yrMB')/1024).toFixed(1)} GB**
- Est. full archive (all states, ~10–25 yrs each): **${tot('archGB').toFixed(0)} GB** (range ≈ ${(tot('archGB')*0.5).toFixed(0)}–${(tot('archGB')*1.8).toFixed(0)} GB)
- Relative effort: ${tot('eff')} pts (A=1, B=2.5, C=5)

**Universal fallback:** every state reports federal-aid roads to FHWA's HPMS, giving one uniform 50-state AADT layer (lower detail, ~annual). Recommended as phase 1, then add state portals for local roads, class counts, and history.

## Size model
segments = public road miles × 0.30; 2.5 KB/segment with geometry; PDF-based states add 30–60 MB/yr of map PDFs; classification/continuous data +25%.

## Per state
| St | Agency | Tier | Formats | Hist. yrs | Class | Est. segs | Est. 1-yr MB | Est. archive GB | In app | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
${rows.map(r=>`| ${r.code} | ${r.agency} | ${r.tier} | ${r.fmt} | ${r.hist} | ${r.cls} | ${r.segs.toLocaleString()} | ${r.yrMB} | ${r.archGB} | ${r.reg?'yes':''} | ${r.note} |`).join('\n')}

## Caveats / next step
1. Verify each portal live (URL, license, format, history depth) before committing to ingestion.
2. Largest items: ${[...rows].sort((a,b)=>b.archGB-a.archGB).slice(0,5).map(r=>`${r.code} (${r.archGB} GB)`).join(', ')}.
3. Browser IndexedDB can't hold this; a full archive needs a backend/object store (the app is currently client-only with seeded sample data).
`;
writeFileSync(join(dir,'STATE_SCOPE.md'),md);
console.log(md.split('\n').slice(0,16).join('\n'));
