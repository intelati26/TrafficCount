// Builds Parquet (zstd) data files locally. Nothing here is committed: output goes to the git-ignored public/data/q/.
//
//   deno run -A npm:tsx scripts/build-data.ts --seed            # convert the app's bundled sample data (pipeline test)
//   deno run -A npm:tsx scripts/build-data.ts --source scripts/sources/MO.json [--limit N]   # live ArcGIS REST fetch
//   deno run -A npm:tsx scripts/build-data.ts --ardot [--limit N]   # Arkansas native (ARDOT inventory + ADT history back to 1986)
//   deno run -A npm:tsx scripts/build-data.ts --hpms RI [--years 1]  # 1 = latest only; HPMS section ids are not stable across years, so history joins match poorly [--out DIR]   # FHWA HPMS for any state
//   deno run -A npm:tsx scripts/build-data.ts --state MO --geojson path/to/aadt.geojson --map scripts/maps/MO.json
//
// --map is a JSON file mapping source property names to our columns, e.g.
//   {"id":"OBJECTID","route":"ROUTE","county":"COUNTY","aadt":{"2024":"AADT_2024","2023":"AADT_2023"},"lanes":"LANES"}
import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync, appendFileSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DuckDBInstance } from '@duckdb/node-api';

// Three files per state:
//  seg/<ST>.parquet   one row per segment: geometry, latest-year core stats (traffic, crashes, lanes, direction), wide aadt_<year> columns. All app builds.
//  hist/<ST>.parquet  one row per segment x year: every CORE statistic for that year (config `core`). All app builds.
//  attr/<ST>.parquet  one row per segment x year: every OTHER source attribute for that year. Desktop only, fetched by id on demand.
function historySink(st: string, core: string[]) {
  const keep = new Set(core.map(f => f.toLowerCase()));
  const dir = join(OUT, 'hist'); mkdirSync(dir, { recursive: true }); mkdirSync(join(OUT, 'attr'), { recursive: true });
  const coreFile = join(dir, `${st}.parquet.ndjson`), fullFile = join(OUT, 'attr', `${st}.parquet.ndjson`);
  writeFileSync(coreFile, ''); writeFileSync(fullFile, '');
  let nc = 0, nf = 0, bufC: string[] = [], bufF: string[] = [];
  const flush = () => { if (bufC.length) appendFileSync(coreFile, bufC.join('\n') + '\n'); if (bufF.length) appendFileSync(fullFile, bufF.join('\n') + '\n'); bufC = []; bufF = []; };
  return {
    onYearRow(year: number, id: string, p: Record<string, any>) {
      const c: any = { id, year }, f: any = { id, year };
      for (const [k, v] of Object.entries(p)) { if (v == null) continue; (keep.has(k.toLowerCase()) ? c : f)['src_' + k.toLowerCase()] = v; }
      bufC.push(JSON.stringify(c)); nc++;
      if (Object.keys(f).length > 2) { bufF.push(JSON.stringify(f)); nf++; }
      if (bufC.length >= 5000) flush();
    },
    async finish(manifest: any, extra: Record<string, unknown>, singleYear = false) {
      flush();
      if (nc && !singleYear) manifest.files.push({ state: st, kind: 'hist', ...await ndjsonToParquet(coreFile, join(OUT, 'hist', `${st}.parquet`), [], 'ORDER BY id, year'), ...extra });
      else rmSync(coreFile); // single-year builds: core stats already sit in seg/
      if (nf) manifest.files.push({ state: st, kind: 'attr', ...await ndjsonToParquet(fullFile, join(OUT, 'attr', `${st}.parquet`), [], 'ORDER BY id, year'), ...extra });
      else rmSync(fullFile);
    },
  };
}

async function writeSeg(st: string, rows: SegRow[], manifest: any, extra: Record<string, unknown>) {
  manifest.files.push({ state: st, kind: 'seg', ...await writeParquet(rows, join(OUT, `seg/${st}.parquet`), ['geom', 'geom_lo']), ...extra });
}

function arg(name: string) { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; }
const OUT = arg('--out') ? resolve(arg('--out')!) : join(process.cwd(), 'public/data/q');
const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

type LngLat = [number, number];

import { encodeGeom, toWKB } from './geomcodec';
export { toWKB };

// Douglas-Peucker; tolerance in degrees (~100 m = 0.0009)
function simplify(pts: LngLat[], tol: number): LngLat[] {
  if (pts.length <= 2) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

interface SegRow { [k: string]: unknown }
function segRow(state: string, s: any): SegRow {
  const lines: LngLat[][] = s.lines ?? [s.coordinates];
  const all = lines.flat();
  const lngs = all.map(p => p[0]), lats = all.map(p => p[1]);
  const row: SegRow = {
    id: s.id, seg_key: s.segKey ?? s.id, state, aadt_basis: s.aadtBasis ?? 'unknown', facility_type: s.facilityType ?? null, aadt_flag: s.aadtFlag ?? null, route: s.route, route_type: s.routeType, district_id: s.districtId, county: s.county,
    description: s.description, mp_start: s.logmileStart, mp_end: s.logmileEnd, lanes: s.lanes, speed_limit: s.speedLimit,
    fclass: s.functionalClass, commercial_aadt: s.commercialAadt, commercial_pct: s.commercialPercent,
    single_unit: s.singleUnitTrucks, combination: s.combinationTrucks, k_factor: s.kFactor, d_factor: s.dFactor,
    peak_hour_volume: s.peakHourVolume, connected_ids: JSON.stringify(s.connectedSegmentIds ?? []),
    mileage_length: s.mileageLength ?? null, corridor_group: s.corridorGroup ?? null,
    min_lng: Math.min(...lngs), max_lng: Math.max(...lngs), min_lat: Math.min(...lats), max_lat: Math.max(...lats),
    center_lng: s.centerPoint?.[0] ?? (lngs.reduce((a, b) => a + b, 0) / lngs.length), center_lat: s.centerPoint?.[1] ?? (lats.reduce((a, b) => a + b, 0) / lats.length),
    geom: encodeGeom(lines).toString('hex'), // delta-varint @1e-7 deg (~1 cm); see scripts/geomcodec.ts
    geom_lo: encodeGeom(lines.map(l => simplify(l, 0.0009))).toString('hex'),
  };
  for (const [k, v] of Object.entries<any>(s.extras ?? {})) row['src_' + k.toLowerCase()] = v;
  if (s.aadtByYear) {
    for (const [y, v] of Object.entries<any>(s.aadtByYear)) row[`aadt_${y}`] = v;
    row.aadt_year = s.countYear ?? Math.max(...Object.keys(s.aadtByYear).map(Number)); // most recent year that has a count
    row.aadt_cur = s.aadtCurrent;
    row.has_count = (s.hasCount ?? (s.aadtCurrent > 0)) ? 1 : 0; // 0/1, not BOOLEAN: DuckDB-WASM cannot skip boolean pages ("PlainSkip not implemented")
    row.years_counted = s.yearsCounted ?? Object.values(s.aadtByYear).filter((v: any) => v > 0).length;
  } else {
    for (const y of YEARS) row[`aadt_${y}`] = y === 2024 ? s.aadtCurrent : s[`aadt${y}`] ?? null;
    row.aadt_year = 2024;
    row.aadt_cur = s.aadtCurrent;
    row.has_count = s.aadtCurrent > 0 ? 1 : 0;
    row.years_counted = YEARS.filter(y => (y === 2024 ? s.aadtCurrent : s[`aadt${y}`]) > 0).length;
  }
  return row;
}

function staRow(state: string, s: any): SegRow {
  return {
    id: s.id, state, station_number: s.stationNumber, route: s.route, county: s.county, district_id: s.districtId,
    location: s.locationDescription, milepost: s.milepost, station_type: s.stationType, direction: s.directionMonitored,
    aadt: s.annualAverageDailyTraffic, commercial_daily: s.commercialVehiclesDaily, commercial_pct: s.commercialPercentage,
    peak_hour: s.peakHour, peak_hour_volume: s.peakHourVolume, lng: s.coordinates[0], lat: s.coordinates[1],
    hourly: JSON.stringify(s.hourlyProfile), dow: JSON.stringify(s.dayOfWeekFactor),
    monthly: JSON.stringify(s.monthlyFactor), classes: JSON.stringify(s.vehicleClasses),
  };
}

function docRow(state: string, d: any): SegRow {
  return {
    id: d.id, state, agency: d.agencyAcronym ?? null, title: d.title, year: d.year, category: d.category,
    district_id: d.districtId ?? null, district_name: d.districtName ?? null, format: d.format, size_mb: d.fileSizeMb,
    sha256: d.sha256Hash, official_url: d.officialUrl, description: d.description, coverage: d.coverageArea,
    sheets: d.sheetCount, dpi: d.resolutionDpi,
  };
}

async function writeParquet(rows: SegRow[], file: string, blobCols: string[] = []) {
  if (!rows.length) return null;
  mkdirSync(join(file, '..'), { recursive: true });
  const tmp = file + '.ndjson';
  // chunked: one big join() exceeds V8's max string length for 400k+ rows
  writeFileSync(tmp, '');
  for (let i = 0; i < rows.length; i += 5000) appendFileSync(tmp, rows.slice(i, i + 5000).map(r => JSON.stringify(r)).join('\n') + '\n');
  const order = 'route' in rows[0] ? 'ORDER BY route, ' + ('mp_start' in rows[0] ? 'mp_start' : 'milepost') : '';
  return ndjsonToParquet(tmp, file, blobCols, order, rows.length);
}

// Streams an NDJSON file into zstd Parquet without holding the rows in memory (used for the per-year files, which can be millions of rows).
async function ndjsonToParquet(tmp: string, file: string, blobCols: string[] = [], order = '', rowCount?: number) {
  mkdirSync(join(file, '..'), { recursive: true });
  const con = await (await DuckDBInstance.create(':memory:')).connect();
  // keep the machine alive: cap DuckDB memory, use few threads, spill to disk next to the output (not /tmp)
  const spill = join(file, '..', '.duck_tmp'); mkdirSync(spill, { recursive: true });
  await con.run(`SET memory_limit='2GB'; SET threads=2; SET preserve_insertion_order=false; SET temp_directory='${spill}'`);
  const src = `read_json_auto('${tmp}', format='newline_delimited', sample_size=-1, maximum_object_size=16777216)`;
  // all-null columns are inferred as JSON or NULL, which DuckDB-WASM cannot skip pages of ("PlainSkip not implemented"): store them as VARCHAR
  const desc = await con.runAndReadAll(`DESCRIBE SELECT * FROM ${src}`);
  const jsonCols = desc.getRowObjectsJson().filter((r: any) => ['JSON', 'NULL', '"NULL"'].includes(r.column_type)).map((r: any) => r.column_name as string);
  const repl = [...blobCols.map(c => `unhex(${c}) AS ${c}`), ...jsonCols.map(c => `CAST("${c}" AS VARCHAR) AS "${c}"`)];
  const cols = repl.length ? `* REPLACE (${repl.join(', ')})` : '*';
  await con.run(`COPY (SELECT ${cols} FROM ${src} ${order}) TO '${file}' (FORMAT parquet, COMPRESSION zstd)`);
  const rows = rowCount ?? Number((await con.runAndReadAll(`SELECT count(*) n FROM read_parquet('${file}')`)).getRowObjectsJson()[0].n);
  con.closeSync();
  rmSync(tmp); rmSync(spill, { recursive: true, force: true });
  const buf = readFileSync(file);
  return { file: file.slice(OUT.length + 1), rows, bytes: statSync(file).size, sha256: createHash('sha256').update(buf).digest('hex') };
}

function loadGeoJSON(path: string, mapPath: string) {
  const m = JSON.parse(readFileSync(mapPath, 'utf8'));
  const gj = JSON.parse(readFileSync(path, 'utf8'));
  return gj.features.filter((f: any) => /LineString/.test(f.geometry?.type)).map((f: any, i: number) => {
    const p = f.properties, g = f.geometry;
    const lines: LngLat[][] = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
    const aadt: Record<number, number> = {};
    for (const [y, col] of Object.entries<string>(m.aadt ?? {})) aadt[+y] = Number(p[col]) || 0;
    const get = (k: string, d: any = null) => (m[k] ? p[m[k]] : d) ?? d;
    return {
      id: String(get('id', i)), lines, route: get('route', 'UNKNOWN'), routeType: get('routeType', 'State Route'),
      districtId: get('district', ''), county: get('county', ''), description: get('description', ''),
      logmileStart: +get('mpStart', 0), logmileEnd: +get('mpEnd', 0), lanes: +get('lanes', 0), speedLimit: +get('speed', 0),
      functionalClass: get('fclass', 'Major Collector'), aadtCurrent: aadt[2024] ?? 0,
      ...Object.fromEntries(YEARS.map(y => [`aadt${y}`, aadt[y] ?? null])),
      commercialAadt: +get('truckAadt', 0), commercialPercent: +get('truckPct', 0), singleUnitTrucks: 0, combinationTrucks: 0,
      kFactor: +get('k', 0), dFactor: +get('d', 0), peakHourVolume: 0,
    };
  });
}

// Every native/HPMS build goes through here so memory stays flat: sections are written to NDJSON as they are read (never held as a list),
// per-year rows stream through historySink, and DuckDB (capped at 2 GB) converts each file to Parquet at the end.
const sampleLimit = () => (arg('--limit') ? +arg('--limit')! : arg('--max-pages') ? +arg('--max-pages')! * 2000 : undefined);
async function streamBuild(st: string, manifest: any, core: string[], source: string,
  run: (onRow: (r: any) => void, onYearRow: (y: number, id: string, p: Record<string, any>) => void) => Promise<{ years: number[]; latest: number; count?: number }>) {
  const sink = historySink(st, core);
  mkdirSync(join(OUT, 'seg'), { recursive: true });
  const segFile = join(OUT, 'seg', `${st}.parquet.ndjson`); writeFileSync(segFile, '');
  let buf: string[] = [], n = 0;
  const flush = () => { if (buf.length) appendFileSync(segFile, buf.join('\n') + '\n'); buf = []; };
  const r = await run(row => { buf.push(JSON.stringify(segRow(st, row))); n++; if (buf.length >= 2000) flush(); }, sink.onYearRow);
  flush();
  const meta = { years: r.years, latest: r.latest, source };
  manifest.files.push({ state: st, kind: 'seg', ...await ndjsonToParquet(segFile, join(OUT, 'seg', `${st}.parquet`), ['geom', 'geom_lo'], 'ORDER BY route, mp_start', r.count ?? n), ...meta });
  await sink.finish(manifest, meta, r.years.length < 2);
}

async function main() {
  const manifest: any = { built: new Date().toISOString(), years: YEARS, files: [] as any[] };
  if (process.argv.includes('--seed')) {
    const reg = await import('../src/data/stateRegistry');
    const states = [...new Set(reg.INITIAL_MULTI_STATE_SEGMENTS.map((s: any) => s.stateCode ?? 'MO'))] as string[];
    let existing: any = { files: [] };
    try { existing = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')); } catch {}
    for (const st of states) {
      // never replace real built data (it has a `source`) with the bundled sample data
      if (existing.files.some((x: any) => x.state === st && x.kind === 'seg' && x.source)) { console.log(`skip ${st}: real data present`); continue; }
      const f = (x: any) => (x.stateCode ?? 'MO') === st;
      manifest.files.push({ state: st, kind: 'seg', ...await writeParquet(reg.INITIAL_MULTI_STATE_SEGMENTS.filter(f).map((s: any) => segRow(st, s)), join(OUT, `seg/${st}.parquet`), ['geom', 'geom_lo']) });
      manifest.files.push({ state: st, kind: 'sta', ...await writeParquet(reg.INITIAL_MULTI_STATE_STATIONS.filter(f).map((s: any) => staRow(st, s)), join(OUT, `sta/${st}.parquet`)) });
      manifest.files.push({ state: st, kind: 'docs', ...await writeParquet(reg.INITIAL_MULTI_STATE_DOCUMENTS.filter(f).map((d: any) => docRow(st, d)), join(OUT, `docs/${st}.parquet`)) });
    }
  } else if (process.argv.includes('--mississippi')) {
    const { fetchMississippi, MS_CORE } = await import('./ms-source');
    await streamBuild('MS', manifest, MS_CORE, 'Mississippi RCI c.2019 re-hosted by HDR Inc. (ArcGIS Online 04HiymDgLlsbhaV4, layer 3); not an MDOT service',
      (onRow, onYearRow) => fetchMississippi({ limit: sampleLimit(), onRow, onYearRow }));
  } else if (process.argv.includes('--delaware')) {
    const { fetchDelaware, DE_CORE } = await import('./de-source');
    await streamBuild('DE', manifest, DE_CORE, 'DelDOT FirstMap Transportation/DE_Assets layer 10 (traffic counts, last 10 years)',
      (onRow, onYearRow) => fetchDelaware({ onRow, onYearRow }));
  } else if (process.argv.includes('--ardot')) {
    const { fetchArdot, ARDOT_CORE } = await import('./ardot-source');
    await streamBuild('AR', manifest, ARDOT_CORE, 'ARDOT gis.ardot.gov SIR_TIS (Road_Inventory_OnSystem + ADTLinear)',
      (onRow, onYearRow) => fetchArdot({ limit: sampleLimit(), onRow, onYearRow }));
  } else if (arg('--hpms')) {
    const { fetchArcgisSegments, hpmsConfig } = await import('./arcgis-source');
    const st = arg('--hpms')!.toUpperCase();
    const cfg = await hpmsConfig(st, +(arg('--years') ?? 1));
    await streamBuild(st, manifest, cfg.core, 'FHWA HPMS (geo.dot.gov)',
      (onRow, onYearRow) => fetchArcgisSegments(cfg, { limit: arg('--limit') ? +arg('--limit')! : undefined, maxPages: arg('--max-pages') ? +arg('--max-pages')! : undefined, onRow, onYearRow }));
  } else if (arg('--source')) {
    const { fetchArcgisSegments } = await import('./arcgis-source');
    const cfgPath = resolve(arg('--source')!);
    const srcCfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    await streamBuild(srcCfg.state, manifest, srcCfg.core ?? [], srcCfg.service,
      (onRow, onYearRow) => fetchArcgisSegments(cfgPath, { limit: arg('--limit') ? +arg('--limit')! : undefined, maxPages: arg('--max-pages') ? +arg('--max-pages')! : undefined, onRow, onYearRow }));
  } else {
    const st = arg('--state'), gj = arg('--geojson'), map = arg('--map');
    if (!st || !gj || !map) { console.error('usage: --seed | --state XX --geojson file --map map.json'); process.exit(1); }
    const segs = loadGeoJSON(gj, map);
    manifest.files.push({ state: st, kind: 'seg', ...await writeParquet(segs.map((s: any) => segRow(st, s)), join(OUT, `seg/${st}.parquet`), ['geom', 'geom_lo']) });
  }
  // merge with an existing manifest so states can be built one at a time
  let prev: any = { files: [] };
  try { prev = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')); } catch {}
  const key = (f: any) => `${f.state}/${f.kind}`;
  const merged = new Map([...prev.files, ...manifest.files.filter((f: any) => f.file)].map((f: any) => [key(f), f]));
  manifest.files = [...merged.values()];
  mkdirSync(OUT, { recursive: true });
  // atomic write: two builds (e.g. Missouri alongside the HPMS queue) can finish close together; re-read + rename keeps either from truncating the file
  const mf = join(OUT, 'manifest.json');
  try { const latest = JSON.parse(readFileSync(mf, 'utf8')); const mine = new Set(manifest.files.map((f: any) => `${f.state}/${f.kind}`)); manifest.files = [...latest.files.filter((f: any) => !mine.has(`${f.state}/${f.kind}`)), ...manifest.files]; } catch {}
  writeFileSync(mf + '.tmp', JSON.stringify(manifest, null, 1)); renameSync(mf + '.tmp', mf);
  try { (await import('node:child_process')).execFileSync('node', ['scripts/summary.mjs'], { stdio: 'ignore' }); } catch {} // keep docs/summary.html current
  for (const f of manifest.files) console.log(`${f.file}  ${f.rows} rows  ${(f.bytes / 1024).toFixed(1)} KB`);
}
main();
