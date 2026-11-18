// Fetches traffic segments from an ArcGIS REST MapServer/FeatureServer described by a scripts/sources/<ST>.json file.
// Latest year comes with geometry; earlier years are fetched attribute-only and joined on the id fields (no repeated geometry).
import { readFileSync } from 'node:fs';

type LngLat = [number, number];
const UA = { 'user-agent': 'traffic-archive-builder/0.1 (local build)' };
const PAGE = 2000;

// FHWA's geo.dot.gov backs onto a database with few connection slots: under load it answers HTTP 500 ("remaining connection slots are
// reserved"). Retry patiently with exponential backoff + jitter (2s, 4s ... 60s) for 5xx/429/timeouts; fail fast on other 4xx.
export async function getJson(url: string, tries = 9): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(150000) });
      if (!r.ok) { const e: any = new Error('HTTP ' + r.status); e.retry = r.status >= 500 || r.status === 429; throw e; }
      const j = await r.json();
      if (j.error) { const e: any = new Error(j.error.message ?? 'service error'); e.retry = (j.error.code ?? 500) >= 500; throw e; }
      return j;
    } catch (e: any) {
      const retryable = e.retry ?? true; // network errors and timeouts have no flag: retry
      if (!retryable || i >= tries) throw e;
      await new Promise(r => setTimeout(r, Math.min(60000, 2000 * 2 ** i) * (0.75 + Math.random() * 0.5)));
    }
  }
}

export async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } }));
  return out;
}

export const q = (o: Record<string, string | number | boolean>) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

async function count(base: string, where: string): Promise<number> {
  return (await getJson(`${base}/query?${q({ where, returnCountOnly: true, f: 'json' })}`)).count;
}

export async function pages(base: string, where: string, outFields: string, geometry: boolean, oid: string, log: (s: string) => void, maxPages?: number): Promise<any[]> {
  const total = await count(base, where);
  const offsets = Array.from({ length: Math.min(Math.ceil(total / PAGE), maxPages ?? Infinity) }, (_, i) => i * PAGE); // maxPages: preflight/sample builds fetch only the first pages
  let done = 0;
  const parts = await pool(offsets, 4, async (off) => {
    const j = await getJson(`${base}/query?${q({
      where, outFields, returnGeometry: geometry, outSR: 4326, orderByFields: oid, resultOffset: off, resultRecordCount: PAGE, f: geometry ? 'geojson' : 'json',
    })}`);
    log(`    ${base.split('/').slice(-2).join('/')} ${where.slice(0, 22)} ${Math.min(++done * PAGE, total)}/${total}`);
    return j.features as any[];
  });
  return parts.flat();
}

/** Fetches pages 4 at a time but hands them to onPage one by one, in order, and drops them: memory stays at a few pages however large the layer. */
export async function forEachPage(base: string, where: string, outFields: string, geometry: boolean, oid: string, log: (s: string) => void, maxPages: number | undefined, onPage: (features: any[]) => Promise<boolean | void> | boolean | void): Promise<number> {
  const total = await count(base, where);
  const n = Math.min(Math.ceil(total / PAGE), maxPages ?? Infinity);
  let done = 0;
  const PAR = Number(process.env.PAGE_PARALLEL ?? 2); // 2 not 4: deep offsets take up to a minute each and the server has few connection slots
  for (let b = 0; b < n; b += PAR) {
    const batch = await Promise.all(Array.from({ length: Math.min(PAR, n - b) }, (_, i) => getJson(`${base}/query?${q({
      where, outFields, returnGeometry: geometry, outSR: 4326, orderByFields: oid, resultOffset: (b + i) * PAGE, resultRecordCount: PAGE, f: geometry ? 'geojson' : 'json',
    })}`).then(j => j.features as any[])));
    for (const feats of batch) { done++; if (await onPage(feats) === false) return total; }
    log(`    ${base.split('/').slice(-2).join('/')} ${where.slice(0, 22)} ${Math.min(done * PAGE, total)}/${total}`);
  }
  return total;
}

export async function fetchArcgisSegments(cfgOrPath: string | any, opts: { limit?: number; maxPages?: number; log?: (s: string) => void; onRow?: (row: any) => void; onYearRow?: (year: number, segId: string, props: Record<string, any>) => void } = {}) {
  const cfg = typeof cfgOrPath === 'string' ? JSON.parse(readFileSync(cfgOrPath, 'utf8')) : cfgOrPath;
  const log = opts.log ?? console.log;
  const F = cfg.fields;
  // layers are separate directions, and the same segment id can appear in several of them: include the layer in the key
  const key = (p: any, li: number) => `${li}-` + cfg.idFields.map((f: string) => p[f]).join('-');
  const perYear: Record<string, string> | undefined = cfg.serviceByYear; // {year: layer url}: FHWA HPMS publishes one service per year
  const bases: string[] = perYear ? [Object.entries(perYear).sort().at(-1)![1]] : cfg.layers.map((l: number) => `${cfg.service}/${l}`);
  const baseWhere = cfg.where ?? '1=1';

  // layer metadata: OID field name + latest year
  const metas = await Promise.all(bases.map(b => getJson(`${b}?f=json`)));
  const oids = metas.map(m => m.fields.find((f: any) => f.type === 'esriFieldTypeOID')?.name ?? 'OBJECTID');
  const stat = perYear ? [] : await Promise.all(bases.map(b => getJson(`${b}/query?${q({ where: '1=1', outStatistics: JSON.stringify([{ statisticType: 'max', onStatisticField: cfg.yearField, outStatisticFieldName: 'y' }]), f: 'json' })}`)));
  const latest = perYear ? Math.max(...Object.keys(perYear).map(Number)) : Math.max(...stat.map(s => Object.values(s.features[0].attributes)[0] as number));
  const years: number[] = perYear ? Object.keys(perYear).map(Number).sort().slice(-cfg.yearsBack) : Array.from({ length: cfg.yearsBack }, (_, i) => latest - i).reverse();
  log(`  ${cfg.state}: latest year ${latest}, history ${years[0]}-${latest}`);

  // Every year is fetched WITH geometry, newest first. A feature is matched to an already-seen segment by layer + route + endpoints
  // (so re-numbered ids still merge); otherwise it is a segment that only existed in that year and is added. Result: every segment
  // that has a count in ANY year, not just those present in the latest year.
  const r5 = (n: number) => n.toFixed(5);
  const all: any[] = [];
  const seen = new Map<string, any[]>();
  // Single-year builds (every HPMS state) stream each section out as it is read, with no signature map and no row list: memory stays flat.
  // Multi-year builds (Missouri) must keep sections until every year has been matched, then emit them.
  const streaming = !!opts.onRow && years.length === 1;
  let made = 0, count = 0, counted = 0;
  const finalize = (s: any) => {
    const ys = Object.entries(s.aadtByYear).filter(([, v]) => (v as number) > 0).map(([yy]) => +yy);
    const ly = ys.length ? Math.max(...ys) : latest;
    s.aadtCurrent = (s.aadtByYear[ly] as number) || 0; s.countYear = ly; s.hasCount = ys.length > 0; s.yearsCounted = ys.length;
  };
  const yearsDesc = [...years].sort((a, b) => b - a);
  for (const y of yearsDesc) {
    let matched = 0, added = 0, bad = 0;
    const sources: { base: string; oid: string; li: number }[] = [];
    if (perYear) {
      const hb = perYear[y]; if (!hb) continue;
      const hm = await getJson(`${hb}?f=json`);
      const names = new Set(hm.fields.map((f: any) => f.name));
      const need = [cfg.aadtField, F.desg, F.fclass, F.lanes].filter((f: string) => f && !names.has(f));
      if (need.length) { log(`  ${y}: skipped (schema differs, missing ${need.join(', ')})`); continue; }
      sources.push({ base: hb, oid: hm.fields.find((f: any) => f.type === 'esriFieldTypeOID')?.name ?? 'objectid', li: 0 });
    } else bases.forEach((b, li) => sources.push({ base: b, oid: oids[li], li }));

    for (const src of sources) {
      let stop = false;
      await forEachPage(src.base, perYear ? baseWhere : `${cfg.yearField}=${y}`, '*', true, src.oid, y === latest ? log : () => {}, opts.maxPages, async (feats) => {
        for (const f of feats) {
          if (!f.geometry || !/LineString/.test(f.geometry.type)) { bad++; continue; }
          const p = f.properties;
          const lines: LngLat[][] = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
          const first = lines[0][0], last = lines[lines.length - 1].at(-1)!;
          const desg = String(p[F.desg] ?? '').trim(), name = String(p[F.name] ?? '').trim() || String(p[F.name2] ?? '').trim();
          const sig = `${src.li}|${desg}|${name}|${r5(first[0])},${r5(first[1])}|${r5(last[0])},${r5(last[1])}`;
          const aadt = Number(p[cfg.aadtField]) || 0;
          if (!streaming) {
            const list = seen.get(sig) ?? [];
            const hit = list.find(s => s.aadtByYear[y] === undefined);
            if (hit) { hit.aadtByYear[y] = aadt || null; matched++; opts.onYearRow?.(y, hit.id, p); continue; }
          }
          const trucks = cfg.hpms ? (Number(p.aadt_single_unit) || 0) + (Number(p.aadt_combination) || 0) : 0;
          const pct = cfg.hpms ? (aadt ? trucks / aadt : 0) : Number(p[F.truckPct]) || 0;
          const seg: any = {
            id: `${cfg.state}-${src.li}-${made}`, segKey: `${cfg.state}|${sig}`, stateCode: cfg.state, lines,
            route: `${cfg.routePrefix?.[desg] ?? desg + ' '}${name}`.trim(), routeType: cfg.routeType?.[desg] ?? 'Numbered Route',
            districtId: String(p[F.district] ?? '').trim(), county: F.county ? String(p[F.county] ?? '') : '', description: String(p[F.description] ?? '').trim(),
            logmileStart: Number(p[F.mpStart]) || 0, logmileEnd: Number(p[F.mpEnd]) || 0, lanes: Number(p[F.lanes]) || 0,
            speedLimit: parseInt(String(p[F.speed]).trim()) || 0, functionalClass: cfg.fclassMap?.[String(p[F.fclass])] ?? 'Local',
            aadtByYear: { [y]: aadt || null }, aadtCurrent: aadt, lastYear: y,
            // AADT semantics differ by source: HPMS reports ONE two-way total per section (both carriageways); MoDOT's directional layers report per direction.
            aadtBasis: cfg.aadtBasis ?? (cfg.hpms ? 'two-way' : 'unknown'), facilityType: cfg.hpms ? (p.facility_type ?? null) : null,
            extras: Object.fromEntries((cfg.core ?? []).map((k: string) => [k, p[k] ?? null])), // latest-year core stats as src_<field>; every year's full attributes stream out through onYearRow
            aadtFlag: cfg.hpms && Number(p.facility_type) === 4 ? 'non-mainline' : null, // ramps/frontage/connectors often carry the mainline's (or a doubled) value
            commercialPercent: cfg.truckPctIsFraction || cfg.hpms ? pct * 100 : pct, commercialAadt: cfg.hpms ? trucks : Math.round(aadt * (cfg.truckPctIsFraction ? pct : pct / 100)),
            singleUnitTrucks: cfg.hpms ? Number(p.aadt_single_unit) || 0 : 0, combinationTrucks: cfg.hpms ? Number(p.aadt_combination) || 0 : 0,
            kFactor: cfg.hpms ? (Number(p.k_factor) || 0) / 100 : 0, dFactor: cfg.hpms ? (Number(p.dir_factor) || 0) / 100 : 0, peakHourVolume: 0,
          };
          made++; added++;
          opts.onYearRow?.(y, seg.id, p);
          if (streaming) { finalize(seg); count++; if (seg.hasCount) counted++; opts.onRow!(seg); }  // single-year builds: emit and forget
          else { const list = seen.get(sig) ?? []; list.push(seg); seen.set(sig, list); all.push(seg); }
          if (opts.limit && made >= opts.limit) { stop = true; break; }
        }
        return !stop;
      });
      if (stop) break;
    }
    log(`  ${y}: matched ${matched}, new ${added}${bad ? `, ${bad} without line geometry` : ''}`);
  }

  // Keep EVERY segment's geometry (uncounted ones too, for future features); flag which have a count in any year.
  // "current" = most recent counted year.
  if (!streaming) {
    for (const s of all) { finalize(s); count++; if (s.hasCount) counted++; }
    if (opts.onRow) { for (const s of all) opts.onRow(s); all.length = 0; seen.clear(); }
  }
  log(`  ${count} segments kept; ${counted} have a count in at least one year`);
  return { rows: all, years, latest, count, counted };
}

/** Build a source config for FHWA's HPMS services (geo.dot.gov), one service per submittal year, uniform schema for every state. */
// yearsBack defaults to 1: HPMS section boundaries, ids and even field names change between yearly submissions, so snapshots cannot be
// joined reliably (tested on RI: 2020 matched 446 of 41k sections). Earlier vintages are better kept as separate per-year snapshots.
export async function hpmsConfig(st: string, yearsBack = 1) {
  const root = 'https://geo.dot.gov/server/rest/services';
  const dir = await getJson(`${root}/Hosted?f=json`);
  const serviceByYear: Record<string, string> = {};
  for (const s of dir.services) {
    const m = /^Hosted\/HPMS_FULL_([A-Z]{2})\d?_(\d{4})$/i.exec(s.name);
    if (m && m[1].toUpperCase() === st) serviceByYear[m[2]] = `${root}/${s.name}/FeatureServer/0`;
  }
  if (!Object.keys(serviceByYear).length) throw new Error(`no HPMS_FULL services for ${st}`);
  return {
    state: st, agency: 'FHWA HPMS', hpms: true, aadtBasis: 'two-way',
    extra: '*', // every HPMS attribute is kept; `core` ones go in the main file for all app builds, the rest in the desktop-only sidecar
    core: ['aadt', 'facility_type', 'through_lanes', 'dir_through_lanes', 'managed_lanes', 'managed_lanes_type', 'peak_lanes', 'counter_peak_lanes', 'turn_lanes_r', 'turn_lanes_l', 'lane_width', 'median_type', 'median_width', 'shoulder_type', 'shoulder_width_r', 'shoulder_width_l', 'aadt_single_unit', 'aadt_combination', 'pct_dh_single', 'pct_dh_combination', 'k_factor', 'dir_factor', 'future_aadt'],
    serviceByYear, where: process.env.VITE_PREFLIGHT ? 'aadt>0' : '1=1', yearsBack, // preflight samples counted sections so a first page of unmeasured local roads is not a false alarm
    idFields: ['route_id', 'begin_point', 'end_point'], aadtField: 'aadt',
    fields: { desg: 'route_signing', name: 'route_number', name2: 'route_name', description: 'route_name', county: 'county_id', lanes: 'through_lanes', speed: 'speed_limit', fclass: 'f_system', mpStart: 'begin_point', mpEnd: 'end_point' },
    routePrefix: { '2': 'I-', '3': 'US-', '4': 'SR-', '6': 'CR-' },
    routeType: { '2': 'Interstate', '3': 'US Highway', '4': 'State Route', '6': 'Numbered Route' },
    fclassMap: { '1': 'Interstate', '2': 'Freeway & Expressway', '3': 'Other Principal Arterial', '4': 'Minor Arterial', '5': 'Major Collector', '6': 'Minor Collector', '7': 'Local' },
  };
}
