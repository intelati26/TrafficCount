// Discovers and live-verifies per-state traffic-count services via the ArcGIS Online search API, in spiral order from Missouri.
// Usage: node scoping/discover.mjs [XX ...]   -> scoping/discovered.json and scoping/VALID_SITES.md
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe } from './arcgis-probe.mjs';
const dir = dirname(fileURLToPath(import.meta.url));

const NAMES = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming' };
// spiral order = same as scoping/SPIRAL.md (read it back so the two stay in step)
const order = readFileSync(join(dir, 'SPIRAL.md'), 'utf8').split('\n').filter(l => /^\| \d+ \|/.test(l)).map(l => l.split('|')[3].trim()).filter(s => NAMES[s]);
const only = process.argv.slice(2).map(s => s.toUpperCase());
const states = only.length ? only : order;

const J = async (u) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'traffic-archive-scoping/0.1' } }); return await r.json(); } catch { await new Promise(r => setTimeout(r, 800)); } } return null; };
const official = (st, it) => {
  const name = NAMES[st], blob = `${it.owner} ${it.title} ${it.snippet ?? ''} ${it.description ?? ''} ${it.accessInformation ?? ''} ${it.orgId ?? ''}`;
  const agency = new RegExp(`(department of transportation|\\bdot\\b|${st}DOT|dotd|\\btdot\\b|transportation (cabinet|division))`, 'i');
  const county = /(county|city of|town of|mpo|council of governments|\bcog\b|metropolitan|planning commission|university|\bllc\b|inc\b|engineering|consult)/i;
  return (new RegExp(name, 'i').test(blob) || new RegExp(`${st}DOT|^${st}`, 'i').test(it.owner)) && agency.test(blob) && !county.test(it.owner) ? 2 : (agency.test(it.owner) && !county.test(it.owner) ? 1 : 0);
};

async function discover(st) {
  const name = NAMES[st], seen = new Map();
  for (const q of [`(AADT OR "annual average daily traffic" OR "traffic counts") AND (${name}) AND (type:"Feature Service" OR type:"Map Service")`, `(AADT OR "traffic volume" OR "traffic count") AND ${st}DOT`]) {
    const d = await J(`https://www.arcgis.com/sharing/rest/search?${new URLSearchParams({ q, num: '30', sortField: 'numviews', sortOrder: 'desc', f: 'json' })}`);
    for (const r of d?.results ?? []) if (r.url && !seen.has(r.url)) seen.set(r.url, { owner: r.owner, title: r.title, url: r.url, views: r.numViews, modified: r.modified ? new Date(r.modified).toISOString().slice(0, 10) : null, score: official(st, r) });
  }
  const cands = [...seen.values()].filter(c => /aadt|traffic|adt|volume|count/i.test(c.title + c.url)).sort((a, b) => b.score - a.score || b.views - a.views);
  const top = cands.filter(c => c.score > 0).slice(0, 4);
  const probed = [];
  for (const c of top) { const layers = await probe(c.url); probed.push({ ...c, layers: layers.filter(l => !l.error).map(l => ({ id: l.url.split('/').pop(), name: l.name, geometry: l.geometry, count: l.count, aadt: l.aadtFields.slice(0, 6), srid: l.srid })), error: layers.every(l => l.error) ? layers[0].error : null }); }
  return { state: st, candidates: cands.length, official: top.length, probed, others: cands.filter(c => c.score === 0).slice(0, 3).map(c => ({ owner: c.owner, title: c.title, url: c.url })) };
}

const out = [];
for (let i = 0; i < states.length; i += 5) out.push(...await Promise.all(states.slice(i, i + 5).map(discover)));
writeFileSync(join(dir, 'discovered.json'), JSON.stringify(out, null, 1));

let md = `# Valid sites by state (ArcGIS Online discovery, live-probed)\n\nIn spiral order from Missouri. "Official-looking" = owner/title/description names the state and a transportation agency and the owner is not a county, city, MPO or consultant; this is a heuristic, confirm ownership before relying on a source. Layers are probed live (geometry, row count, AADT-like fields).\n\n`;
for (const r of out) {
  md += `## ${r.state} ${NAMES[r.state]}\n`;
  if (!r.probed.length) { md += `No official-looking service found (${r.candidates} candidates). `; if (r.others.length) md += `Unverified: ${r.others.map(o => `${o.title} (${o.owner})`).join('; ')}.`; md += '\n\n'; continue; }
  for (const p of r.probed) {
    md += `- **${p.title}** — owner \`${p.owner}\`, modified ${p.modified}, ${p.views?.toLocaleString()} views\n  ${p.url}\n`;
    if (p.error) md += `  - not reachable: ${p.error}\n`;
    for (const l of p.layers.slice(0, 6)) md += `  - layer ${l.id} ${l.name}: ${l.geometry?.replace('esriGeometry', '')}, ${l.count?.toLocaleString() ?? '?'} rows, fields: ${l.aadt.join(', ')}\n`;
    if (p.layers.length > 6) md += `  - … ${p.layers.length - 6} more layers\n`;
  }
  md += '\n';
}
writeFileSync(join(dir, 'VALID_SITES.md'), md);
console.log(`${out.length} states; with an official-looking live service: ${out.filter(r => r.probed.some(p => p.layers.length)).length}`);
for (const r of out) console.log(r.state, r.official, r.probed.filter(p => p.layers.length).length ? 'LIVE' : '-', r.probed.filter(p => p.layers.length).map(p => `${p.owner}:${p.title.slice(0, 30)}`).slice(0, 2).join(' | '));
