// Build a state from FHWA's HPMS service ON THIS DEVICE: fetch the pages, turn them into the same rows the desktop scripts write,
// let DuckDB (already in the app) write the zstd Parquet file, and keep it in device storage. Mirrors scripts/build-data.ts --hpms.
import { queryDb } from '../services/queryDb';
import { saveLocalFile } from '../services/localData';
import { HPMS_ROOT, hpmsRow, hpmsSchema } from './hpms';

export interface BuildProgress { stage: 'finding' | 'fetching' | 'converting' | 'saving' | 'done'; pagesDone: number; pagesTotal: number; rows: number; bytes?: number; message?: string }
export interface BuildOptions { signal?: AbortSignal; onProgress?: (p: BuildProgress) => void; parallel?: number }
export interface BuildResult { state: string; year: number; rows: number; counted: number; bytes: number }

const PAGE = 2000;
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Cancelled', 'AbortError')); }, { once: true }); });

// FHWA's server answers HTTP 500 ("connection slots") under load: retry patiently with exponential backoff, fail fast on other 4xx.
async function getJson(url: string, signal?: AbortSignal, tries = 9): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { signal });
      if (!r.ok) { const e: any = new Error('HTTP ' + r.status); e.retry = r.status >= 500 || r.status === 429; throw e; }
      const j = await r.json();
      if (j.error) { const e: any = new Error(j.error.message ?? 'service error'); e.retry = (j.error.code ?? 500) >= 500; throw e; }
      return j;
    } catch (e: any) {
      if (e?.name === 'AbortError' || !(e.retry ?? true) || i >= tries) throw e;
      await sleep(Math.min(60000, 2000 * 2 ** i) * (0.75 + Math.random() * 0.5), signal);
    }
  }
}

const q = (o: Record<string, string | number | boolean>) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

/** Latest HPMS service for a state: { url, year } */
export async function findHpms(state: string, signal?: AbortSignal): Promise<{ url: string; year: number }> {
  const dir = await getJson(`${HPMS_ROOT}/Hosted?f=json`, signal);
  let best: { name: string; year: number } | null = null;
  for (const s of dir.services as { name: string }[]) {
    const m = /^Hosted\/HPMS_FULL_([A-Z]{2})\d?_(\d{4})$/i.exec(s.name);
    if (m && m[1].toUpperCase() === state && (!best || +m[2] > best.year)) best = { name: s.name, year: +m[2] };
  }
  if (!best) throw new Error(`FHWA has no HPMS service for ${state}.`);
  return { url: `${HPMS_ROOT}/${best.name}/FeatureServer/0`, year: best.year };
}

const building = new Set<string>(); // one build per state at a time (they share DuckDB file and table names)

export async function buildHpmsOnDevice(state: string, opts: BuildOptions = {}): Promise<BuildResult> {
  if (building.has(state)) throw new Error(`${state} is already being built.`);
  building.add(state);
  try { return await run(state, opts); } finally { building.delete(state); }
}

async function run(state: string, opts: BuildOptions): Promise<BuildResult> {
  const { signal, onProgress } = opts;
  const emit = (p: Partial<BuildProgress> & { stage: BuildProgress['stage'] }) => onProgress?.({ pagesDone: 0, pagesTotal: 0, rows: 0, ...p });
  emit({ stage: 'finding' });
  const { url, year } = await findHpms(state, signal);
  const meta = await getJson(`${url}?f=json`, signal);
  const oid = (meta.fields as { name: string; type: string }[]).find((f) => f.type === 'esriFieldTypeOID')?.name ?? 'objectid';
  const total: number = (await getJson(`${url}/query?${q({ where: '1=1', returnCountOnly: true, f: 'json' })}`, signal)).count;
  const pages = Math.ceil(total / PAGE), par = Math.max(1, opts.parallel ?? 2);

  const engine = await queryDb.engine();
  const conn = await engine.connect();
  const schema = hpmsSchema(year);
  const table = `build_${state}`, outFile = `out_${state}.parquet`, tmp = `batch_${state}.ndjson`;
  const colSpec = '{' + schema.map(([n, t]) => `'${n}': '${t === 'BLOB' ? 'VARCHAR' : t}'`).join(', ') + '}';
  let rows = 0, counted = 0, serial = 0, done = 0;
  try {
    await conn.query(`DROP TABLE IF EXISTS ${table}`);
    await conn.query(`CREATE TABLE ${table} (${schema.map(([n, t]) => `"${n}" ${t}`).join(', ')})`);
    for (let b = 0; b < pages; b += par) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const batch = await Promise.all(Array.from({ length: Math.min(par, pages - b) }, (_, i) => getJson(`${url}/query?${q({
        where: '1=1', outFields: '*', returnGeometry: true, outSR: 4326, orderByFields: oid, resultOffset: (b + i) * PAGE, resultRecordCount: PAGE, f: 'geojson' })}`, signal).then((j) => j.features as any[])));
      const lines: string[] = []; // ids count kept sections only (those with line geometry), like the desktop build
      for (const feats of batch) for (const f of feats) { const r = hpmsRow(state, year, serial, f); if (r) { serial++; lines.push(JSON.stringify(r)); if (r.has_count === 1) counted++; } }
      done += batch.length;
      if (lines.length) {
        await engine.registerFileText(tmp, lines.join('\n'));
        await conn.query(`INSERT INTO ${table} SELECT * REPLACE (unhex(geom) AS geom, unhex(geom_lo) AS geom_lo) FROM read_json('${tmp}', format='newline_delimited', columns=${colSpec})`);
        await engine.dropFile(tmp);
        rows += lines.length;
      }
      emit({ stage: 'fetching', pagesDone: done, pagesTotal: pages, rows });
    }
    emit({ stage: 'converting', pagesDone: pages, pagesTotal: pages, rows });
    await conn.query(`COPY (SELECT * FROM ${table} ORDER BY route, mp_start) TO '${outFile}' (FORMAT PARQUET, COMPRESSION ZSTD)`);
    const bytes = await engine.copyFileToBuffer(outFile);
    emit({ stage: 'saving', pagesDone: pages, pagesTotal: pages, rows, bytes: bytes.length });
    await saveLocalFile('seg', state, bytes, { rows, years: [year], latest: year, source: 'FHWA HPMS (built on this device)' });
    emit({ stage: 'done', pagesDone: pages, pagesTotal: pages, rows, bytes: bytes.length });
    return { state, year, rows, counted, bytes: bytes.length };
  } finally {
    try { await conn.query(`DROP TABLE IF EXISTS ${table}`); } catch { /* ignore */ }
    for (const f of [tmp, outFile]) { try { await engine.dropFile(f); } catch { /* not registered */ } }
    await conn.close();
  }
}
