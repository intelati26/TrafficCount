// Mississippi source: the Mississippi Roadway Characteristics Inventory (RCI), c. 2019, as re-hosted by HDR Inc. on ArcGIS Online
// (published by an HDR Inc. staff account, not an MDOT-run service; static copy made for the MDOT transit study). Layer 3 "RC_AADT_2019" has one row per
// RCI section with ADT_11..ADT_21 (2011-2021), lanes, shoulders, medians, speed limit, functional class. Keyed by SRI + BEGINMILE/ENDMILE,
// the same key MDOT's current centerlines (MARIS, gis.mississippi.edu MS_MDOTLRM_Nov25) use, so geometry can be swapped for the current network later.
import { getJson, q } from './arcgis-source';
type LngLat = [number, number];
const LAYER = 'https://services.arcgis.com/04HiymDgLlsbhaV4/arcgis/rest/services/Mississippi_RCI/FeatureServer/3';
export const MS_CORE = ['AADT', 'YEAR', 'ADT_21', 'TOTAL_LANE', 'P_NMBRTHRU', 'S_NMBRTHRU', 'P_LAUXLANE', 'S_LAUXLANE', 'INV_DIRECT', 'INVLANEWID', 'MEDIANTYPE', 'MEDIANWIDT', 'LSHOULDERW', 'RSHOULDERW', 'LSHOULDERT', 'RSHOULDERT', 'SPEEDLIMIT', 'FUNCCLASSN', 'ACCESSCTLN', 'TRAFFICFLO', 'ROUTECLASS'];
// FUNCCLASSN: rural 1,2,6,7,8,9 and urban 11,12,14,16,17,19 (HPMS legacy system codes; recalled, not verified against MDOT's manual)
const FC: Record<string, string> = { '1': 'Interstate', '11': 'Interstate', '12': 'Freeway & Expressway', '2': 'Other Principal Arterial', '14': 'Other Principal Arterial', '6': 'Minor Arterial', '16': 'Minor Arterial', '7': 'Major Collector', '17': 'Major Collector', '8': 'Minor Collector', '9': 'Local', '19': 'Local' };

export async function fetchMississippi(opts: { limit?: number; log?: (s: string) => void; onRow?: (row: any) => void; onYearRow?: (year: number, id: string, p: Record<string, any>) => void } = {}) {
  const log = opts.log ?? console.log;
  const total = (await getJson(`${LAYER}/query?${q({ where: '1=1', returnCountOnly: true, f: 'json' })}`)).count as number;
  const want = opts.limit ? Math.min(total, opts.limit) : total;
  const PAGE = 2000, rows: any[] = []; let bad = 0, count = 0, counted = 0;
  const years = Array.from({ length: 11 }, (_, i) => 2011 + i);
  for (let off = 0; off < want; off += PAGE) {
    const j = await getJson(`${LAYER}/query?${q({ where: '1=1', outFields: '*', returnGeometry: true, outSR: 4326, orderByFields: 'OBJECTID', resultOffset: off, resultRecordCount: Math.min(PAGE, want - off), f: 'geojson' })}`);
    for (const f of j.features) {
      if (!f.geometry || !/LineString/.test(f.geometry.type)) { bad++; continue; }
      const p = f.properties;
      const lines: LngLat[][] = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const aadtByYear: Record<number, number> = {};
      for (const y of years) { const v = Number(p[`ADT_${String(y).slice(2)}`]); if (v > 0) aadtByYear[y] = v; }
      const ys = Object.keys(aadtByYear).map(Number), countYear = ys.length ? Math.max(...ys) : 2021;
      const segKey = `MS|${p.SRI}|${p.BEGINMILE}|${p.ENDMILE}`;
      const lanes = Number(p.TOTAL_LANE) || (Number(p.P_NMBRTHRU) || 0) + (Number(p.S_NMBRTHRU) || 0);
      const id = `${segKey}|${p.OBJECTID}`;
      const row = {
        id, segKey, stateCode: 'MS', lines, route: String(p.ROUTEID ?? '').trim(), routeType: 'Numbered Route', districtId: '', county: String(p.COUNTYNMBR ?? ''),
        description: String(p.SRI ?? ''), logmileStart: Number(p.BEGINMILE) || 0, logmileEnd: Number(p.ENDMILE) || 0, lanes, speedLimit: Number(p.SPEEDLIMIT) || 0,
        functionalClass: FC[String(p.FUNCCLASSN)] ?? 'Local', aadtByYear, aadtCurrent: aadtByYear[countYear] ?? 0, countYear, hasCount: ys.length > 0, yearsCounted: ys.length,
        aadtBasis: 'unknown', facilityType: null, aadtFlag: null, extras: Object.fromEntries(MS_CORE.map(k => [k, p[k] ?? null])),
        commercialPercent: 0, commercialAadt: 0, singleUnitTrucks: 0, combinationTrucks: 0, kFactor: 0, dFactor: 0, peakHourVolume: 0,
      };
      count++; if (row.hasCount) counted++;
      if (opts.onRow) opts.onRow(row); else rows.push(row); // onRow streams rows out so a million sections never sit in memory
      if (opts.onYearRow) ys.sort((a, b) => b - a).forEach((y, i) => opts.onYearRow!(y, id, i === 0 ? { ...p, AADT: aadtByYear[y], YEAR: y } : { AADT: aadtByYear[y], YEAR: y })); // static fields only once: repeating them per year made a 9 GB file
    }
    if ((off / PAGE) % 25 === 0) log(`    RCI ${Math.min(off + PAGE, want)}/${want}`);
  }
  log(`  MS: ${count} sections (${bad} without line geometry); ${counted} with a count in 2011-2021`);
  return { rows, years, latest: 2021, count };
}
