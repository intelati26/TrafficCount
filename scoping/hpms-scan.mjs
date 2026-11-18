// Scans FHWA's hosted HPMS FeatureServers (geo.dot.gov) for all states: years available, AADT layer, record counts.
// Output: scoping/hpms-scan.json
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const ROOT = 'https://geo.dot.gov/server/rest/services';
const J = async (u, t = 3) => { for (let i = 0; ; i++) { try { const r = await fetch(u, { signal: AbortSignal.timeout(40000), headers: { 'user-agent': 'traffic-archive-scoping/0.1' } }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; } catch (e) { if (i >= t) throw e; await new Promise(r => setTimeout(r, 700 * (i + 1))); } } };

const dirList = await J(`${ROOT}/Hosted?f=json`);
const by = {};
for (const s of dirList.services) {
  const m = /^Hosted\/HPMS_FULL_([A-Z]{2})\d?_(\d{4})$/i.exec(s.name);
  if (m) (by[m[1].toUpperCase()] ??= {})[+m[2]] = s.name;
}
const states = Object.keys(by).sort();
console.log(`${states.length} states with HPMS_FULL services`);

async function scan(st) {
  const years = Object.keys(by[st]).map(Number).sort();
  const latest = years.at(-1);
  const svc = `${ROOT}/${by[st][latest]}/FeatureServer/0`;
  try {
    const cnt = async (w) => (await J(`${svc}/query?where=${encodeURIComponent(w)}&returnCountOnly=true&f=json`)).count;
    const [rows, aadtRows, fedRows] = await Promise.all([cnt('1=1'), cnt('aadt>0'), cnt('f_system IS NOT NULL')]);
    return { state: st, years, latest, service: svc, rows, aadtRows, fedAidRows: fedRows };
  } catch (e) { return { state: st, years, latest, service: svc, error: String(e.message) }; }
}
const res = [];
for (let i = 0; i < states.length; i += 6) res.push(...await Promise.all(states.slice(i, i + 6).map(scan)));
writeFileSync(join(dir, 'hpms-scan.json'), JSON.stringify(res, null, 1));
for (const r of res) console.log(r.state, r.years.join(','), '|', r.error ? 'ERR ' + r.error : `rows=${r.rows} aadt>0=${r.aadtRows} fedAid=${r.fedAidRows}`);
