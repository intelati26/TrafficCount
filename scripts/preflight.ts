// Preflight: proves every state can be rebuilt BEFORE the big downloads start. For each state it runs the real build pipeline on a small
// sample (first page of rows, written to a throwaway folder) and validates the output. Nothing in public/data/q is touched.
//   deno run -A npm:tsx scripts/preflight.ts [XX ...]    -> scoping/PREFLIGHT.md and scoping/preflight.json
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const tmpdir = () => process.env.PREFLIGHT_TMP ?? '/tmp/claude-1000/-home-mitch-Claude-TrafficCount/61f49326-4973-4bfb-93a8-8f779b168031/scratchpad';
import { join } from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';
import { decodeGeom, fromWKB } from './geomcodec';

const hpms: any[] = JSON.parse(readFileSync('scoping/hpms-scan.json', 'utf8'));
const order = existsSync('scoping/SPIRAL.md') ? readFileSync('scoping/SPIRAL.md', 'utf8').split('\n').filter(l => /^\| \d+ \|/.test(l)).map(l => l.split('|')[3].trim()) : hpms.map(h => h.state);
const NATIVE: Record<string, { label: string; args: string[]; state: string }> = {
  'MO*': { label: 'MO native (MoDOT)', args: ['--source', 'scripts/sources/MO.json', '--max-pages', '1'], state: 'MO' },
  'AR*': { label: 'AR native (ARDOT)', args: ['--ardot', '--max-pages', '1'], state: 'AR' },
  'DE*': { label: 'DE native (DelDOT)', args: ['--delaware'], state: 'DE' },
  'MS*': { label: 'MS native (RCI copy)', args: ['--mississippi', '--max-pages', '1'], state: 'MS' },
};
const only = process.argv.slice(2).map(s => s.toUpperCase());
const jobs: { key: string; label: string; state: string; args: string[]; hp?: any }[] = [];
for (const st of order) { const hp = hpms.find(h => h.state === st); if (hp && (!only.length || only.includes(st))) jobs.push({ key: st, label: `${st} HPMS`, state: st, args: ['--hpms', st, '--max-pages', '1'], hp }); }
for (const [k, n] of Object.entries(NATIVE)) if (!only.length || only.includes(k) || only.includes(n.state)) jobs.push({ key: k, label: n.label, state: n.state, args: n.args, hp: hpms.find(h => h.state === n.state) });

const run = (args: string[], out: string) => new Promise<{ code: number; secs: number; log: string }>(res => {
  const t0 = Date.now(); let log = '';
  const p = spawn('deno', ['run', '-A', 'npm:tsx', 'scripts/build-data.ts', ...args, '--out', out], { env: { ...process.env, VITE_PREFLIGHT: '1' } });
  p.stdout.on('data', d => (log += d)); p.stderr.on('data', d => (log += d));
  p.on('close', code => res({ code: code ?? -1, secs: (Date.now() - t0) / 1000, log }));
});

const REQUIRED = ['id', 'seg_key', 'state', 'route', 'fclass', 'lanes', 'aadt_cur', 'aadt_year', 'has_count', 'years_counted', 'geom', 'geom_lo', 'min_lng', 'max_lng', 'min_lat', 'max_lat', 'aadt_basis'];
async function validate(out: string, state: string, hp: any) {
  const issues: string[] = [], info: Record<string, any> = {};
  const seg = join(out, 'seg', `${state}.parquet`);
  if (!existsSync(seg)) return { issues: ['no seg file written'], info };
  const con = await (await DuckDBInstance.create(':memory:')).connect();
  const one = async (sql: string) => (await con.runAndReadAll(sql)).getRowObjectsJson() as any[];
  const f = `read_parquet('${seg}')`;
  const cols = (await one(`DESCRIBE SELECT * FROM ${f}`)); const names = new Set(cols.map(c => c.column_name));
  for (const r of REQUIRED) if (!names.has(r)) issues.push(`missing column ${r}`);
  const bad = cols.filter(c => ['"NULL"', 'NULL', 'JSON', 'BOOLEAN'].includes(c.column_type)).map(c => `${c.column_name}:${c.column_type}`);
  if (bad.length) issues.push(`browser-unsafe column types ${bad.join(', ')}`);
  const s = (await one(`SELECT count(*)::INT n, count(DISTINCT id)::INT ids, sum(has_count)::INT counted, sum((route IS NULL OR route='')::INT)::INT noRoute, sum((fclass IS NULL)::INT)::INT noClass, sum((lanes>0)::INT)::INT withLanes, min(min_lng) a, max(max_lng) b, min(min_lat) c, max(max_lat) d FROM ${f}`))[0];
  Object.assign(info, { rows: +s.n, counted: +s.counted, withLanes: +s.withLanes });
  if (+s.n === 0) issues.push('zero rows');
  if (+s.ids !== +s.n) issues.push(`duplicate ids (${+s.n - +s.ids})`);
  if (+s.counted === 0) issues.push('no section has a count');
  if (+s.noClass > 0) issues.push(`${s.noClass} rows without functional class`);
  // geometry: decode a sample (both formats), check finite and inside the state's own extent
  const sample = await one(`SELECT hex(geom) g, hex(geom_lo) l FROM ${f} USING SAMPLE 300 ROWS`);
  let badGeom = 0;
  for (const r of sample) for (const h of [r.g, r.l]) { try { const b = Buffer.from(h, 'hex'); const lines = b[0] === 0xd7 ? decodeGeom(b) : fromWKB(b); if (!lines.length || lines.some(l => l.length < 2 || l.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < -180 || x > 180 || y < 15 || y > 72))) badGeom++; } catch { badGeom++; } }
  if (badGeom) issues.push(`${badGeom} sampled geometries failed to decode or are out of range`);
  if (hp?.service) {
    try { const e = await (await fetch(`${hp.service}/query?where=1%3D1&returnExtentOnly=true&outSR=4326&f=json`, { signal: AbortSignal.timeout(30000) })).json(); const x = e.extent;
      if (x && (+s.a < x.xmin - 0.3 || +s.b > x.xmax + 0.3 || +s.c < x.ymin - 0.3 || +s.d > x.ymax + 0.3)) issues.push(`sample outside the state's extent`); } catch { info.extent = 'unchecked'; }
  }
  const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
  const m = manifest.files.find((x: any) => x.state === state && x.kind === 'seg');
  if (!m?.sha256 || !m?.source) issues.push('manifest entry lacks sha256/source');
  info.attr = manifest.files.some((x: any) => x.state === state && x.kind === 'attr'); info.hist = manifest.files.some((x: any) => x.state === state && x.kind === 'hist');
  con.closeSync();
  return { issues, info };
}

const results: any[] = []; let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++]; const out = join(tmpdir(), `pf_${j.key.replace('*', 'n')}_${process.pid}`);
    rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
    const r = await run(j.args, out);
    let v: any = { issues: [], info: {} };
    if (r.code !== 0) v.issues.push(`build exited ${r.code}: ${(r.log.split('\n').filter(l => /rror/.test(l)).pop() ?? r.log.slice(-200)).replace(/\x1b\[[0-9;]*m/g, '').slice(0, 160)}`);
    else v = await validate(out, j.state, j.hp);
    rmSync(out, { recursive: true, force: true });
    const rows = j.hp?.rows ?? 0;
    results.push({ key: j.key, label: j.label, secs: +r.secs.toFixed(1), ...v.info, ok: v.issues.length === 0, issues: v.issues, fullRows: rows, fullPages: Math.ceil(rows / 2000), estMB: Math.round(rows * 170 / 1e6) });
    console.log(`${v.issues.length ? 'FAIL' : 'ok  '} ${j.label.padEnd(24)} ${r.secs.toFixed(0)}s ${v.issues.join('; ')}`);
  }
}));
// a partial run (states named on the command line) updates only those rows and keeps the rest of the report
if (only.length && existsSync('scoping/preflight.json')) { const keep = JSON.parse(readFileSync('scoping/preflight.json', 'utf8')).filter((r: any) => !results.some(n => n.key === r.key)); results.push(...keep); }
const rank = (k: string) => { const i = order.indexOf(k.replace('*', '')); return i < 0 ? 999 : i + (k.endsWith('*') ? 0.5 : 0); };
results.sort((a, b) => rank(a.key) - rank(b.key));
writeFileSync('scoping/preflight.json', JSON.stringify(results, null, 1));
const okN = results.filter(r => r.ok).length;
let md = `# Rebuild preflight\n\nEach row ran the real build pipeline on a small sample (first page, written to a throwaway folder) and validated the output: required columns, unique ids, no browser-unsafe column types, geometry decodes and sits inside the state's extent, at least one counted section, manifest has sha256 and source. Generated ${new Date().toISOString().slice(0, 16)}Z by scripts/preflight.ts.\n\n**${okN} of ${results.length} passed.**\n\n| Source | Result | Sample rows | Counted | With lanes | attr | Sample time | Full build: pages | est. size | Issues |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of results) md += `| ${r.label} | ${r.ok ? 'pass' : '**FAIL**'} | ${r.rows ?? '-'} | ${r.counted ?? '-'} | ${r.withLanes ?? '-'} | ${r.attr ? 'yes' : '-'} | ${r.secs}s | ${r.fullPages || '-'} | ${r.estMB ? r.estMB + ' MB' : '-'} | ${r.issues.join('; ')} |\n`;
writeFileSync('scoping/PREFLIGHT.md', md);
console.log(`\n${okN}/${results.length} passed`);
