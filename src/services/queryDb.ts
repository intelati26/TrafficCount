// DuckDB-WASM query layer over user-built Parquet files in /data/q/ (see docs/STORAGE_DESIGN.md).
// The repo ships no data: if the manifest is missing, available() resolves false and callers keep the bundled sample data.
import type * as DuckDB from '@duckdb/duckdb-wasm';
import type { TrafficSegment, ContinuousCountStation, MoDOTMapDocument } from '../types/traffic';
import { readLocalManifest, getLocalFile } from './localData';

const BASE = '/data/q/';

export interface CorridorTrend {
  route: string; routeType: string; districtName: string; sections: number; miles: number;
  baseYear: number; baseAadt: number; compareYear: number; compareAadt: number; absoluteChange: number; percentChange: number;
  truckVolumeBase: number; truckVolumeCompare: number; truckPercentChange: number;
  status: 'Heavy Growth' | 'Moderate Growth' | 'Stable' | 'Decline';
}

export interface ManifestFile { state: string; kind: 'seg' | 'sta' | 'docs' | 'attr' | 'hist'; file: string; rows: number; bytes: number; years?: number[]; latest?: number; source?: string; local?: boolean }
interface Manifest { built: string; files: ManifestFile[] }

let manifestP: Promise<Manifest | null> | null = null;
let dbP: Promise<DuckDB.AsyncDuckDB> | null = null;
const registered = new Set<string>();

// Built data comes from two places: files served next to the app (/data/q/, the desktop build) and files stored on this device
// (imported from a Data Pack, see localData.ts). Device files win when both have the same state and kind.
function manifest(): Promise<Manifest | null> {
  manifestP ??= (async () => {
    const remote: Manifest | null = await fetch(BASE + 'manifest.json').then(r => (r.ok ? r.json() : null)).catch(() => null); // the dev server's SPA fallback returns HTML -> parse error -> null
    const local = await readLocalManifest();
    if (!remote && !local?.files.length) return null;
    const files = [...(remote?.files ?? [])];
    for (const lf of local?.files ?? []) { const i = files.findIndex(f => f.state === lf.state && f.kind === lf.kind); if (i >= 0) files[i] = lf; else files.push(lf); }
    return { built: remote?.built ?? local?.built ?? '', files };
  })();
  return manifestP;
}

async function getDb() {
  dbP ??= (async () => {
    const duckdb = await import('@duckdb/duckdb-wasm'); // lazy: keeps ~200 kB out of the main chunk
    // Android app: DuckDB ships inside the app (works offline). The WebView is Chromium, so the exception-handling build is always supported.
    const local = (import.meta as any).env?.VITE_ANDROID
      ? (() => { const b = { mainModule: new URL('/duckdb/duckdb-eh.wasm', location.href).href, mainWorker: new URL('/duckdb/duckdb-browser-eh.worker.js', location.href).href }; return { mvp: b, eh: b }; })()
      : null;
    const bundle = await duckdb.selectBundle(local ?? duckdb.getJsDelivrBundles());
    const workerUrl = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' }));
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl));
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);
    return db;
  })();
  return dbP;
}

const num = (v: unknown) => (typeof v === 'bigint' ? Number(v) : (v as number));

async function query(sql: string): Promise<Record<string, any>[]> {
  const conn = await (await getDb()).connect();
  try {
    return (await conn.query(sql)).toArray().map(r => r.toJSON());
  } finally {
    await conn.close();
  }
}

async function view(state: string, kind: ManifestFile['kind']): Promise<string | null> {
  const m = await manifest();
  const f = m?.files.find(x => x.state === state && x.kind === kind);
  if (!f) return null;
  const name = `${kind}_${state}.parquet`;
  if (!registered.has(name)) {
    const { DuckDBDataProtocol } = await import('@duckdb/duckdb-wasm');
    if (f.local) await (await getDb()).registerFileHandle(name, await getLocalFile(f.file), DuckDBDataProtocol.BROWSER_FSACCESS, true); // read in place from device storage
    else await (await getDb()).registerFileURL(name, new URL(BASE + f.file, location.href).href, DuckDBDataProtocol.HTTP, false);
    registered.add(name);
  }
  return `read_parquet('${name}')`;
}

// ---- geometry decoding ----
// Current builds store delta-varint lines (magic 0xD7, 1e-7 deg, see scripts/geomcodec.ts); older builds stored plain WKB. Both are read.
export function decodeGeom(b: Uint8Array): [number, number][][] {
  if (b[0] === 0xd7) {
    const k = 10 ** b[1]; let o = 2;
    const getU = () => { let r = 0, m = 1, c: number; do { c = b[o++]; r += (c & 127) * m; m *= 128; } while (c & 128); return r; };
    const get = () => { const z = getU(); return z % 2 === 0 ? z / 2 : -(z + 1) / 2; };
    const lines: [number, number][][] = []; let x = 0, y = 0;
    for (let n = getU(); n > 0; n--) {
      const pts: [number, number][] = [];
      for (let m = getU(); m > 0; m--) { x += get(); y += get(); pts.push([x / k, y / k]); }
      lines.push(pts);
    }
    return lines;
  }
  return decodeWKB(b);
}

export function decodeWKB(b: Uint8Array): [number, number][][] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const line = (o: number): { pts: [number, number][]; end: number } => {
    const n = dv.getUint32(o + 5, true);
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) pts.push([dv.getFloat64(o + 9 + i * 16, true), dv.getFloat64(o + 17 + i * 16, true)]);
    return { pts, end: o + 9 + n * 16 };
  };
  if (dv.getUint32(1, true) === 2) return [line(0).pts];
  const n = dv.getUint32(5, true), out: [number, number][][] = [];
  let o = 9;
  for (let i = 0; i < n; i++) { const r = line(o); out.push(r.pts); o = r.end; }
  return out;
}

async function perYear(state: string, kind: 'hist' | 'attr', ids: string[]): Promise<Record<string, Record<string, any>[]>> {
  const src = await view(state, kind);
  if (!src || !ids.length) return {};
  const list = ids.slice(0, 500).map(i => `'${i.replace(/'/g, "''")}'`).join(',');
  const out: Record<string, Record<string, any>[]> = {};
  for (const r of await query(`SELECT * FROM ${src} WHERE id IN (${list}) ORDER BY id, year`)) {
    const { id, year, ...rest } = r;
    (out[id] ??= []).push({ year: Number(year), ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v != null).map(([k, v]) => [k.replace(/^src_/, ''), typeof v === 'bigint' ? Number(v) : v])) });
  }
  return out;
}

function mapRow(r: Record<string, any>, coordinates: [number, number][]): TrafficSegment {
      const history: Record<number, number> = {};
  for (const k of Object.keys(r)) {
    const m = /^aadt_(\d{4})$/.exec(k);
    if (m && r[k] != null) history[+m[1]] = num(r[k]);
  }
  const cur = num(r.aadt_year) || Math.max(...Object.keys(history).map(Number), 0);
  const aadt: Record<string, number> = {};
  for (const y of [2018, 2019, 2020, 2021, 2022, 2023]) aadt[`aadt${y}`] = history[y] ?? 0;
  return {
    id: r.id, stateCode: r.state, route: r.route, routeType: r.route_type, districtId: r.district_id, county: r.county,
    description: r.description, logmileStart: num(r.mp_start), logmileEnd: num(r.mp_end), lanes: num(r.lanes),
    speedLimit: num(r.speed_limit), functionalClass: r.fclass,
    connectedSegmentIds: JSON.parse(r.connected_ids ?? '[]'), mileageLength: r.mileage_length ?? undefined,
    corridorGroup: r.corridor_group ?? undefined,
    ...aadt, aadtHistory: history, aadtCurrent: history[cur] ?? 0, countYear: cur || undefined,
    aadtBasis: r.aadt_basis ?? undefined, aadtFlag: r.aadt_flag ?? null, segKey: r.seg_key ?? undefined,
    core: Object.fromEntries(Object.entries(r).filter(([k, v]) => k.startsWith('src_') && v != null && v !== '').map(([k, v]) => [k.slice(4), typeof v === 'bigint' ? Number(v) : (v as string | number)])),
    commercialAadt: num(r.commercial_aadt), commercialPercent: num(r.commercial_pct),
    singleUnitTrucks: num(r.single_unit), combinationTrucks: num(r.combination),
    kFactor: num(r.k_factor), dFactor: num(r.d_factor), peakHourVolume: num(r.peak_hour_volume),
    coordinates,
    centerPoint: r.center_lng != null ? [r.center_lng, r.center_lat] : coordinates[Math.floor(coordinates.length / 2)],
  } as TrafficSegment;
}

export const queryDb = {
  /** True when a built data set exists (manifest found). Never throws. */
  async available(): Promise<boolean> { return !!(await manifest()); },

  /** The shared DuckDB engine (used by the on-device builder to turn fetched rows into Parquet). */
  async engine(): Promise<DuckDB.AsyncDuckDB> { return getDb(); },

  /** Forget cached manifest and file registrations (after importing or removing device data). */
  async reload(): Promise<void> {
    const db = dbP ? await dbP : null;
    for (const n of registered) { try { await db?.dropFile(n); } catch { /* not registered */ } }
    registered.clear(); manifestP = null;
  },

  /** Where a state's file is read from: 'device' (imported), 'app' (served with the app) or null. */
  async sourceOf(state: string, kind: ManifestFile['kind'] = 'seg'): Promise<'device' | 'app' | null> {
    const f = (await manifest())?.files.find(x => x.state === state && x.kind === kind);
    return f ? (f.local ? 'device' : 'app') : null;
  },

  /** The manifest's file list (empty when no data has been built). Used by the Data Packs download screen. */
  async manifestFiles(): Promise<ManifestFile[]> { return (await manifest())?.files ?? []; },
  dataBase: BASE,

  /** Lng/lat extent of a state's built segments (one cheap query over the Parquet column statistics). */
  async bounds(state: string): Promise<{ minLng: number; maxLng: number; minLat: number; maxLat: number } | null> {
    const src = await view(state, 'seg');
    if (!src) return null;
    const [r] = await query(`SELECT min(min_lng) a, max(max_lng) b, min(min_lat) c, max(max_lat) d FROM ${src}`);
    return r ? { minLng: +r.a, maxLng: +r.b, minLat: +r.c, maxLat: +r.d } : null;
  },

  /** True when built data of this kind exists for the state. */
  async has(state: string, kind: 'seg' | 'sta' | 'docs' | 'attr' | 'hist'): Promise<boolean> {
    return !!(await manifest())?.files.some(f => f.state === state && f.kind === kind);
  },

  async states(): Promise<string[]> {
    return [...new Set(((await manifest())?.files ?? []).map(f => f.state))];
  },

  /** Segments for one state. `bbox` filters by viewport using the min/max columns; `lowRes` uses the simplified geometry. */
  async segments(state: string, opts: { bbox?: [number, number, number, number]; lowRes?: boolean; classes?: string[]; limit?: number; includeUncounted?: boolean; recentOnly?: boolean; mainlineOnly?: boolean; sample?: boolean } = {}): Promise<TrafficSegment[]> {
    const src = await view(state, 'seg');
    if (!src) return [];
    const conds: string[] = [];
    if (opts.bbox) conds.push(`max_lng >= ${+opts.bbox[0]} AND min_lng <= ${+opts.bbox[2]} AND max_lat >= ${+opts.bbox[1]} AND min_lat <= ${+opts.bbox[3]}`);
    if (opts.classes?.length) conds.push(`fclass IN (${opts.classes.map(c => `'${c.replace(/'/g, "''")}'`).join(',')})`);
    // every segment's geometry is stored; by default only those with a count in some year are returned
    if (!opts.includeUncounted) conds.push('has_count = 1');
    // zoomed-out views skip ramps/frontage/connector pieces (flagged non-mainline): they add thousands of tiny overlapping lines
    if (opts.mainlineOnly) conds.push('aadt_flag IS NULL');
    // current network only: segments whose newest count is from the state's latest two data years (older-era segments overlap it)
    if (opts.recentOnly) { const latest = (await manifest())?.files.find(f => f.state === state && f.kind === 'seg')?.latest; if (latest) conds.push(`aadt_year >= ${latest - 1}`); }
    // sample: when more segments match than fit in the budget, keep an even share of ALL of them (every k-th section by id hash) instead of
    // the busiest few: at statewide zoom a section is about a pixel wide, so a thinned line still reads as continuous and rural routes survive
    if (opts.sample && opts.limit) {
      const [{ n }] = await query(`SELECT count(*)::INT n FROM ${src} ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}`);
      if (num(n) > opts.limit) conds.push(`hash(id) % ${Math.ceil(num(n) / opts.limit)} = 0`);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    // with a limit, keep the busiest segments (the ones that matter most when zoomed out)
    const order = opts.limit ? 'ORDER BY aadt_cur DESC NULLS LAST' : 'ORDER BY route, mp_start';
    const rows = await query(`SELECT * FROM ${src} ${where} ${order} ${opts.limit ? `LIMIT ${Math.floor(+opts.limit)}` : ''}`);
    return rows.map(r => mapRow(r, decodeGeom(r[opts.lowRes ? 'geom_lo' : 'geom']).flat()));
  },

  /**
   * Table query over a state's whole data set: search, filter, sort and page in SQL (the map only ever holds what is on screen).
   * Returns the page of rows (no geometry unless asked) and the total number of matches.
   */
  async grid(state: string, o: { search?: string; district?: string; minAadt?: number; minTruckPct?: number; sort?: string; dir?: 'asc' | 'desc'; limit?: number; offset?: number; recentOnly?: boolean; withGeometry?: boolean } = {}): Promise<{ rows: TrafficSegment[]; total: number }> {
    const src = await view(state, 'seg');
    if (!src) return { rows: [], total: 0 };
    const cols = new Set((await query(`SELECT column_name FROM (DESCRIBE SELECT * FROM ${src})`)).map(r => r.column_name as string));
    const esc = (x: string) => x.replace(/'/g, "''").replace(/[%_\\]/g, m => '\\' + m);
    const conds = ['has_count = 1'];
    if (o.recentOnly) { const latest = (await manifest())?.files.find(f => f.state === state && f.kind === 'seg')?.latest; if (latest) conds.push(`aadt_year >= ${latest - 1}`); }
    if (o.search?.trim()) { const t = esc(o.search.trim().toLowerCase()); conds.push(`(lower(route) LIKE '%${t}%' ESCAPE '\\' OR lower(description) LIKE '%${t}%' ESCAPE '\\' OR lower(county) LIKE '%${t}%' ESCAPE '\\' OR lower(fclass) LIKE '%${t}%' ESCAPE '\\')`); }
    if (o.district && o.district !== 'all') conds.push(`district_id = '${o.district.replace(/'/g, "''")}'`);
    if (o.minAadt) conds.push(`aadt_cur >= ${+o.minAadt}`);
    if (o.minTruckPct) conds.push(`commercial_pct >= ${+o.minTruckPct}`);
    const where = 'WHERE ' + conds.join(' AND ');
    const sortMap: Record<string, string> = { route: 'route', county: 'county', districtId: 'district_id', aadtCurrent: 'aadt_cur', aadt2023: cols.has('aadt_2023') ? 'aadt_2023' : 'aadt_cur', commercialAadt: 'commercial_aadt', commercialPercent: 'commercial_pct', peakHourVolume: 'peak_hour_volume', lanes: 'lanes', speedLimit: 'speed_limit' };
    const sort = sortMap[o.sort ?? 'aadtCurrent'] ?? 'aadt_cur';
    const select = o.withGeometry ? '*' : '* EXCLUDE (geom, geom_lo)';
    const [{ n }] = await query(`SELECT count(*)::INT n FROM ${src} ${where}`);
    const rows = await query(`SELECT ${select} FROM ${src} ${where} ORDER BY ${sort} ${o.dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, id LIMIT ${Math.min(Math.max(Math.floor(o.limit ?? 200), 1), 200000)} OFFSET ${Math.max(Math.floor(o.offset ?? 0), 0)}`);
    return { total: num(n), rows: rows.map(r => mapRow(r, o.withGeometry ? decodeGeom(r.geom).flat() : [])) };
  },

  /** Years that have AADT values in a state's main file (columns aadt_YYYY), oldest first. Single-year builds return one year. */
  async years(state: string): Promise<number[]> {
    const src = await view(state, 'seg');
    if (!src) return [];
    const cols = (await query(`SELECT column_name FROM (DESCRIBE SELECT * FROM ${src})`)).map(r => String(r.column_name));
    return cols.map(c => /^aadt_(\d{4})$/.exec(c)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
  },

  /**
   * Route-level change in AADT between two years, computed from the data: each route's segments are length-weighted, only segments
   * counted in BOTH years are used, and the busiest routes (vehicle-miles) come first. Truck volume applies each segment's latest truck
   * share to both years (the files hold truck share for the latest year only for most states).
   */
  async corridorTrends(state: string, baseYear: number, compareYear: number, limit = 40): Promise<CorridorTrend[]> {
    const src = await view(state, 'seg');
    if (!src || !Number.isInteger(baseYear) || !Number.isInteger(compareYear)) return [];
    const b = `aadt_${baseYear}`, c = `aadt_${compareYear}`;
    const rows = await query(`
      SELECT route, any_value(route_type) route_type, any_value(district_id) district,
             count(*)::INT sections, sum(mp_end - mp_start) miles,
             sum(${b} * (mp_end - mp_start)) / sum(mp_end - mp_start) base,
             sum(${c} * (mp_end - mp_start)) / sum(mp_end - mp_start) cmp,
             sum(${c} * coalesce(commercial_pct, 0) / 100 * (mp_end - mp_start)) / sum(mp_end - mp_start) trucks_c
      FROM ${src}
      WHERE ${b} > 0 AND ${c} > 0 AND mp_end > mp_start AND route IS NOT NULL AND route <> ''
      GROUP BY route HAVING sum(mp_end - mp_start) >= 3
      ORDER BY sum(${c} * (mp_end - mp_start)) DESC LIMIT ${Math.floor(limit)}`);
    return rows.map(r => {
      const base = Math.round(num(r.base)), cmp = Math.round(num(r.cmp)), tc = Math.round(num(r.trucks_c));
      const share = cmp ? tc / cmp : 0, tb = Math.round(base * share);
      const pct = base ? Math.round(((cmp - base) / base) * 1000) / 10 : 0;
      return {
        route: String(r.route), routeType: String(r.route_type ?? ''), districtName: r.district ? `District ${r.district}` : '', sections: num(r.sections), miles: Math.round(num(r.miles) * 10) / 10,
        baseYear, baseAadt: base, compareYear, compareAadt: cmp, absoluteChange: cmp - base, percentChange: pct,
        truckVolumeBase: tb, truckVolumeCompare: tc, truckPercentChange: tb ? Math.round(((tc - tb) / tb) * 1000) / 10 : 0,
        status: pct > 15 ? 'Heavy Growth' : pct > 3 ? 'Moderate Growth' : pct >= -3 ? 'Stable' : 'Decline',
      } as CorridorTrend;
    });
  },

  /** Distinct district ids with segment counts (for the grid's district filter). */
  async districts(state: string): Promise<{ id: string; n: number }[]> {
    const src = await view(state, 'seg');
    if (!src) return [];
    return (await query(`SELECT district_id id, count(*)::INT n FROM ${src} WHERE has_count = 1 AND district_id IS NOT NULL AND district_id <> '' GROUP BY 1 ORDER BY 1`)).map(r => ({ id: String(r.id), n: num(r.n) }));
  },

  async stations(state: string): Promise<ContinuousCountStation[]> {
    const src = await view(state, 'sta');
    if (!src) return [];
    return (await query(`SELECT * FROM ${src} ORDER BY route, milepost`)).map(r => ({
      id: r.id, stateCode: r.state, stationNumber: r.station_number, route: r.route, county: r.county, districtId: r.district_id,
      locationDescription: r.location, milepost: num(r.milepost), stationType: r.station_type, directionMonitored: r.direction,
      annualAverageDailyTraffic: num(r.aadt), commercialVehiclesDaily: num(r.commercial_daily),
      commercialPercentage: num(r.commercial_pct), peakHour: r.peak_hour, peakHourVolume: num(r.peak_hour_volume),
      hourlyProfile: JSON.parse(r.hourly), dayOfWeekFactor: JSON.parse(r.dow), monthlyFactor: JSON.parse(r.monthly),
      vehicleClasses: JSON.parse(r.classes), coordinates: [r.lng, r.lat],
    }) as ContinuousCountStation);
  },

  /** Map/PDF catalogue (metadata only; files are opened or saved from official_url, never stored). */
  async documents(state: string): Promise<MoDOTMapDocument[]> {
    const src = await view(state, 'docs');
    if (!src) return [];
    return (await query(`SELECT * FROM ${src} ORDER BY year DESC, title`)).map(r => ({
      id: r.id, stateCode: r.state, agencyAcronym: r.agency ?? undefined, title: r.title, year: num(r.year), category: r.category,
      districtId: r.district_id ?? undefined, districtName: r.district_name ?? undefined, format: r.format,
      fileSizeMb: num(r.size_mb), fileSizeBytes: Math.round(num(r.size_mb) * 1048576), sha256Hash: r.sha256, officialUrl: r.official_url,
      description: r.description, coverageArea: r.coverage, sheetCount: num(r.sheets), resolutionDpi: num(r.dpi),
    }) as MoDOTMapDocument);
  },

  /**
   * Every year's core statistics (AADT, trucks, crashes, lanes, direction...) for one or more segments. All app builds.
   * Returns { id: [{ year, aadt, through_lanes, ... }, ...] } sorted by year; {} when no history was built.
   */
  async history(state: string, ids: string[]): Promise<Record<string, Record<string, any>[]>> {
    return perYear(state, 'hist', ids);
  },

  /**
   * Every OTHER source attribute (pavement, curves, grades, congestion, planning, project names...) per year. Desktop only:
   * lives in attr/<ST>.parquet, fetched by id on demand; returns {} when that file was not built.
   */
  async attributes(state: string, ids: string[]): Promise<Record<string, Record<string, any>[]>> {
    return perYear(state, 'attr', ids);
  },

  /** Free-form read-only SQL for the future query page. `src('seg','MO')` names the registered view. */
  async sql(sql: string): Promise<Record<string, any>[]> { return query(sql); },
  view,
};
