// DuckDB-WASM query layer over user-built Parquet files in /data/q/ (see docs/STORAGE_DESIGN.md).
// The repo ships no data: if the manifest is missing, available() resolves false and callers keep the bundled sample data.
import type * as DuckDB from '@duckdb/duckdb-wasm';
import type { TrafficSegment, ContinuousCountStation, MoDOTMapDocument } from '../types/traffic';

const BASE = '/data/q/';

export interface ManifestFile { state: string; kind: 'seg' | 'sta' | 'docs' | 'attr' | 'hist'; file: string; rows: number; bytes: number; years?: number[]; latest?: number; source?: string }
interface Manifest { built: string; files: ManifestFile[] }

let manifestP: Promise<Manifest | null> | null = null;
let dbP: Promise<DuckDB.AsyncDuckDB> | null = null;
const registered = new Set<string>();

function manifest(): Promise<Manifest | null> {
  manifestP ??= fetch(BASE + 'manifest.json')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null); // dev server's SPA fallback returns HTML -> JSON parse error -> null
  return manifestP;
}

async function getDb() {
  dbP ??= (async () => {
    const duckdb = await import('@duckdb/duckdb-wasm'); // lazy: keeps ~200 kB out of the main chunk
    const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
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
    await (await getDb()).registerFileURL(name, new URL(BASE + f.file, location.href).href, DuckDBDataProtocol.HTTP, false);
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

export const queryDb = {
  /** True when a built data set exists (manifest found). Never throws. */
  async available(): Promise<boolean> { return !!(await manifest()); },

  /** The manifest's file list (empty when no data has been built). Used by the Data Packs download screen. */
  async manifestFiles(): Promise<ManifestFile[]> { return (await manifest())?.files ?? []; },
  dataBase: BASE,

  /** True when built data of this kind exists for the state. */
  async has(state: string, kind: 'seg' | 'sta' | 'docs' | 'attr' | 'hist'): Promise<boolean> {
    return !!(await manifest())?.files.some(f => f.state === state && f.kind === kind);
  },

  async states(): Promise<string[]> {
    return [...new Set(((await manifest())?.files ?? []).map(f => f.state))];
  },

  /** Segments for one state. `bbox` filters by viewport using the min/max columns; `lowRes` uses the simplified geometry. */
  async segments(state: string, opts: { bbox?: [number, number, number, number]; lowRes?: boolean; classes?: string[]; limit?: number; includeUncounted?: boolean } = {}): Promise<TrafficSegment[]> {
    const src = await view(state, 'seg');
    if (!src) return [];
    const conds: string[] = [];
    if (opts.bbox) conds.push(`max_lng >= ${+opts.bbox[0]} AND min_lng <= ${+opts.bbox[2]} AND max_lat >= ${+opts.bbox[1]} AND min_lat <= ${+opts.bbox[3]}`);
    if (opts.classes?.length) conds.push(`fclass IN (${opts.classes.map(c => `'${c.replace(/'/g, "''")}'`).join(',')})`);
    // every segment's geometry is stored; by default only those with a count in some year are returned
    if (!opts.includeUncounted) conds.push('has_count = 1');
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    // with a limit, keep the busiest segments (the ones that matter most when zoomed out)
    const order = opts.limit ? 'ORDER BY aadt_cur DESC NULLS LAST' : 'ORDER BY route, mp_start';
    const rows = await query(`SELECT * FROM ${src} ${where} ${order} ${opts.limit ? `LIMIT ${Math.floor(+opts.limit)}` : ''}`);
    return rows.map(r => {
      const coordinates = decodeGeom(r[opts.lowRes ? 'geom_lo' : 'geom']).flat();
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
        ...aadt, aadtHistory: history, aadtCurrent: history[cur] ?? 0,
        commercialAadt: num(r.commercial_aadt), commercialPercent: num(r.commercial_pct),
        singleUnitTrucks: num(r.single_unit), combinationTrucks: num(r.combination),
        kFactor: num(r.k_factor), dFactor: num(r.d_factor), peakHourVolume: num(r.peak_hour_volume),
        coordinates,
        centerPoint: r.center_lng != null ? [r.center_lng, r.center_lat] : coordinates[Math.floor(coordinates.length / 2)],
      } as TrafficSegment;
    });
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
