// FHWA HPMS (geo.dot.gov) -> one segment row, the same shape scripts/build-data.ts writes, so a state built on a phone is
// indistinguishable from one built on the desktop. Keep the field mappings in step with scripts/arcgis-source.ts (hpmsConfig).
import { encodeGeom, simplify, toHex, type LngLat } from './geom';

export const HPMS_ROOT = 'https://geo.dot.gov/server/rest/services';
// every HPMS attribute listed here is kept in the main file (traffic, lanes, shoulders, medians, truck splits); the rest is desktop-only attribute data
export const HPMS_CORE = ['aadt', 'facility_type', 'through_lanes', 'dir_through_lanes', 'managed_lanes', 'managed_lanes_type', 'peak_lanes', 'counter_peak_lanes', 'turn_lanes_r', 'turn_lanes_l', 'lane_width', 'median_type', 'median_width', 'shoulder_type', 'shoulder_width_r', 'shoulder_width_l', 'aadt_single_unit', 'aadt_combination', 'pct_dh_single', 'pct_dh_combination', 'k_factor', 'dir_factor', 'future_aadt'];
const FCLASS: Record<string, string> = { '1': 'Interstate', '2': 'Freeway & Expressway', '3': 'Other Principal Arterial', '4': 'Minor Arterial', '5': 'Major Collector', '6': 'Minor Collector', '7': 'Local' };
const PREFIX: Record<string, string> = { '2': 'I-', '3': 'US-', '4': 'SR-', '6': 'CR-' };
const RTYPE: Record<string, string> = { '2': 'Interstate', '3': 'US Highway', '4': 'State Route', '6': 'Numbered Route' };
const r5 = (n: number) => n.toFixed(5);

/** Column name -> DuckDB type, in order. aadt_<year> is added at build time. */
export function hpmsSchema(year: number): [string, string][] {
  return [
    ['id', 'VARCHAR'], ['seg_key', 'VARCHAR'], ['state', 'VARCHAR'], ['aadt_basis', 'VARCHAR'], ['facility_type', 'BIGINT'], ['aadt_flag', 'VARCHAR'],
    ['route', 'VARCHAR'], ['route_type', 'VARCHAR'], ['district_id', 'VARCHAR'], ['county', 'VARCHAR'], ['description', 'VARCHAR'],
    ['mp_start', 'DOUBLE'], ['mp_end', 'DOUBLE'], ['lanes', 'BIGINT'], ['speed_limit', 'BIGINT'], ['fclass', 'VARCHAR'],
    ['commercial_aadt', 'BIGINT'], ['commercial_pct', 'DOUBLE'], ['single_unit', 'BIGINT'], ['combination', 'BIGINT'], ['k_factor', 'DOUBLE'], ['d_factor', 'DOUBLE'], ['peak_hour_volume', 'BIGINT'],
    ['connected_ids', 'VARCHAR'], ['mileage_length', 'VARCHAR'], ['corridor_group', 'VARCHAR'],
    ['min_lng', 'DOUBLE'], ['max_lng', 'DOUBLE'], ['min_lat', 'DOUBLE'], ['max_lat', 'DOUBLE'], ['center_lng', 'DOUBLE'], ['center_lat', 'DOUBLE'],
    ['geom', 'BLOB'], ['geom_lo', 'BLOB'],
    ...HPMS_CORE.map((k): [string, string] => ['src_' + k, 'DOUBLE']),
    [`aadt_${year}`, 'BIGINT'], ['aadt_year', 'BIGINT'], ['aadt_cur', 'DOUBLE'], ['has_count', 'BIGINT'], ['years_counted', 'BIGINT'],
  ];
}

/** Turn one GeoJSON feature from an HPMS service into a row, or null when it has no line geometry. geom/geom_lo are hex text (DuckDB unhex()s them). */
export function hpmsRow(state: string, year: number, serial: number, f: { properties: Record<string, any>; geometry?: { type: string; coordinates: any } }): Record<string, unknown> | null {
  const g = f.geometry;
  if (!g || !/LineString/.test(g.type)) return null;
  const p = f.properties;
  const lines: LngLat[][] = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
  const first = lines[0][0], last = lines[lines.length - 1].at(-1)!;
  const desg = String(p.route_signing ?? '').trim(), name = String(p.route_number ?? '').trim() || String(p.route_name ?? '').trim();
  const aadt = Number(p.aadt) || 0;
  const trucks = (Number(p.aadt_single_unit) || 0) + (Number(p.aadt_combination) || 0);
  const pct = aadt ? trucks / aadt : 0;
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90, sx = 0, sy = 0, n = 0;
  for (const l of lines) for (const [x, y] of l) { if (x < minLng) minLng = x; if (x > maxLng) maxLng = x; if (y < minLat) minLat = y; if (y > maxLat) maxLat = y; sx += x; sy += y; n++; }
  const row: Record<string, unknown> = {
    id: `${state}-0-${serial}`, seg_key: `${state}|0|${desg}|${name}|${r5(first[0])},${r5(first[1])}|${r5(last[0])},${r5(last[1])}`, state,
    aadt_basis: 'two-way', facility_type: p.facility_type ?? null, aadt_flag: Number(p.facility_type) === 4 ? 'non-mainline' : null,
    route: `${PREFIX[desg] ?? desg + ' '}${name}`.trim(), route_type: RTYPE[desg] ?? 'Numbered Route', district_id: '', county: String(p.county_id ?? ''), description: String(p.route_name ?? '').trim(),
    mp_start: Number(p.begin_point) || 0, mp_end: Number(p.end_point) || 0, lanes: Number(p.through_lanes) || 0, speed_limit: parseInt(String(p.speed_limit).trim()) || 0,
    fclass: FCLASS[String(p.f_system)] ?? 'Local', commercial_aadt: trucks, commercial_pct: pct * 100,
    single_unit: Number(p.aadt_single_unit) || 0, combination: Number(p.aadt_combination) || 0, k_factor: (Number(p.k_factor) || 0) / 100, d_factor: (Number(p.dir_factor) || 0) / 100, peak_hour_volume: 0,
    connected_ids: '[]', mileage_length: null, corridor_group: null,
    min_lng: minLng, max_lng: maxLng, min_lat: minLat, max_lat: maxLat, center_lng: sx / n, center_lat: sy / n,
    geom: toHex(encodeGeom(lines)), geom_lo: toHex(encodeGeom(lines.map((l) => simplify(l, 0.0009)))),
    [`aadt_${year}`]: aadt > 0 ? aadt : null, aadt_year: year, aadt_cur: aadt, has_count: aadt > 0 ? 1 : 0, years_counted: aadt > 0 ? 1 : 0,
  };
  for (const k of HPMS_CORE) { const v = p[k]; row['src_' + k] = v == null || v === '' ? null : Number(v); }
  return row;
}
