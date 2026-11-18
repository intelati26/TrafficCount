// Regenerates docs/summary.html: build coverage by state in spiral order. Reads public/data/q/manifest.json (what is built),
// scoping/hpms-scan.json (national totals), scoping/discovered.json (source search) and scoping/SPIRAL.md (order).
// Run by hand (node scripts/summary.mjs) or automatically at the end of every scripts/build-data.ts run.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const rd = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } };
const manifest = rd('public/data/q/manifest.json', { files: [] });
const hpms = Object.fromEntries(rd('scoping/hpms-scan.json', []).map(r => [r.state, r]));
const disc = Object.fromEntries(rd('scoping/discovered.json', []).map(r => [r.state, r]));
const order = existsSync('scoping/SPIRAL.md') ? readFileSync('scoping/SPIRAL.md', 'utf8').split('\n').filter(l => /^\| \d+ \|/.test(l)).map(l => { const c = l.split('|').map(s => s.trim()); return { state: c[3], ring: c[2] }; }) : Object.keys(hpms).map(s => ({ state: s, ring: '' }));
const dotOwner = /dot|kytc|tpp_traf|\bmdt\b|trafficsurvey|dotd|udot|wvdot|oklahoma/i;

const states = order.filter(o => o.state.length === 2 && hpms[o.state]?.rows !== undefined).map(o => {
  const f = manifest.files.filter(x => x.state === o.state);
  const seg = f.find(x => x.kind === 'seg'), attr = f.find(x => x.kind === 'attr'), hist = f.find(x => x.kind === 'hist');
  const d = disc[o.state], live = (d?.probed ?? []).filter(p => p.layers.length);
  return {
    state: o.state, ring: o.ring, hpmsRows: hpms[o.state].rows, hpmsAadt: hpms[o.state].aadtRows,
    built: !!seg && seg.source !== undefined, sample: !!seg && seg.source === undefined,
    rows: seg?.rows ?? 0, bytes: (seg?.bytes ?? 0) + (hist?.bytes ?? 0) + (attr?.bytes ?? 0), attr: !!attr, hist: !!hist,
    years: seg?.years?.length ? `${seg.years[0]}–${seg.latest}` : '', source: seg?.source?.includes('HPMS') ? 'HPMS' : seg?.source ? 'state' : '',
    official: live.some(p => dotOwner.test(p.owner)), anyLive: live.length > 0,
  };
});
const data = { generated: new Date().toISOString(), states };
mkdirSync('docs', { recursive: true });
writeFileSync('docs/summary.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Traffic Archive Coverage</title>
<style>
:root{--bg:#f7f8fa;--card:#fff;--ink:#14181f;--mute:#5d6674;--line:#e3e6eb;--built:#1b8a5a;--todo:#c9ced6;--state:#2563eb;--sample:#d99a1c;--bar:#dfe3ea}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0f1218;--card:#171b23;--ink:#e8ebf0;--mute:#98a1b0;--line:#262c37;--built:#34c488;--todo:#3a4150;--state:#6b9bff;--sample:#e8b04a;--bar:#232935}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif;padding:24px 16px}main{max-width:980px;margin:0 auto}
h1{font-size:20px;margin:0 0 2px}.sub{color:var(--mute);margin:0 0 18px;font-size:13px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px}.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.tile b{display:block;font-size:22px}.tile span{color:var(--mute);font-size:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--mute);font-size:12px;margin:0 0 10px}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.row{display:grid;grid-template-columns:34px 1fr 150px;align-items:center;gap:8px;padding:2px 0}.row .st{font-weight:600}.track{height:14px;background:var(--bar);border-radius:3px;position:relative;overflow:hidden}.fill{position:absolute;left:0;top:0;bottom:0;border-radius:3px}
.meta{font-size:11px;color:var(--mute);text-align:right;white-space:nowrap}.ring{margin:10px 0 2px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-left:4px}@media(max-width:560px){.row{grid-template-columns:30px 1fr}.meta{grid-column:2;text-align:left}}
</style></head><body><main>
<h1>Traffic archive coverage</h1><p class="sub" id="sub"></p><div class="tiles" id="tiles"></div>
<div class="card"><p class="legend"><span><i style="background:var(--built)"></i>built (rows kept)</span><span><i style="background:var(--sample)"></i>sample data only</span><span><i style="background:var(--bar)"></i>not built (bar = HPMS sections in the state)</span><span>● official state source found &nbsp; ○ other live source</span></p><div id="chart"></div></div>
</main><script>
const D=${JSON.stringify(data)};const S=D.states,f=n=>n.toLocaleString(),mb=b=>b>=1e9?(b/1e9).toFixed(1)+' GB':(b/1e6).toFixed(b<1e7?1:0)+' MB';
const built=S.filter(s=>s.built),rows=built.reduce((a,s)=>a+s.rows,0),bytes=S.reduce((a,s)=>a+s.bytes,0),tot=S.reduce((a,s)=>a+s.hpmsRows,0);
document.getElementById('sub').textContent='Updated '+new Date(D.generated).toLocaleString()+' · order: outward from Missouri, clockwise from Arkansas';
document.getElementById('tiles').innerHTML=[[built.length+' / '+S.length,'states built'],[f(rows),'segments kept'],[(100*rows/tot).toFixed(1)+'%','of all HPMS sections'],[mb(bytes),'on disk'],[S.filter(s=>s.official).length,'official sources found'],[S.filter(s=>s.attr).length,'with desktop attributes']].map(t=>'<div class="tile"><b>'+t[0]+'</b><span>'+t[1]+'</span></div>').join('');
const max=Math.max(...S.map(s=>s.hpmsRows));let html='',ring=null;
for(const s of S){if(s.ring!==ring){ring=s.ring;html+='<div class="ring">'+(ring==='0'?'Missouri':ring==='far'?'Far':'Ring '+ring)+'</div>'}
const w=100*s.hpmsRows/max,fw=s.built?Math.min(w,100*s.rows/max):0;
const col=s.built?'var(--built)':s.sample?'var(--sample)':'transparent';
html+='<div class="row"><span class="st">'+s.state+'</span><div class="track" title="'+f(s.hpmsRows)+' HPMS sections"><div class="fill" style="width:'+w+'%;background:var(--todo);opacity:.55"></div><div class="fill" style="width:'+(s.built?w:0)+'%;background:'+col+';opacity:.28"></div><div class="fill" style="width:'+fw+'%;background:'+col+'"></div></div><span class="meta">'+(s.built?f(s.rows)+' · '+mb(s.bytes)+(s.years?' · '+s.years:''):s.sample?'sample only':f(s.hpmsRows)+' to do')+'<span class="dot" style="background:'+(s.official?'var(--state)':'transparent')+';border:1.5px solid '+(s.official||s.anyLive?'var(--state)':'var(--todo)')+'"></span></span></div>'}
document.getElementById('chart').innerHTML=html;
</script></body></html>`);
console.log(`docs/summary.html: ${states.filter(s => s.built).length}/${states.length} states built`);
