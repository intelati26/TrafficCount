// Delaware native source: DelDOT traffic counts on the state's FirstMap server (Transportation/DE_Assets layer 10, "TRAFFIC COUNTS LAST 10 YEARS").
// One row per section with CURRENT_AADT plus AADT_LAST_YEAR_1..9 (wide columns). AADT is the two-way total for divided sections (per the layer's own comment).
import { pages } from './arcgis-source';
type LngLat = [number, number];
const LAYER = 'https://enterprise.firstmap.delaware.gov/arcgis/rest/services/Transportation/DE_Assets/FeatureServer/10';
export const DE_CORE = ['AADT', 'YEAR', 'YEAR_LAST_COUNTED', 'COLLECTION_METHOD', 'TRAFFIC_GROUP', 'GROWTH_GROUP'];

export async function fetchDelaware(opts: { limit?: number; log?: (s: string) => void; onRow?: (row: any) => void; onYearRow?: (year: number, id: string, p: Record<string, any>) => void } = {}) {
  const log = opts.log ?? console.log;
  const feats = await pages(LAYER, '1=1', '*', true, 'OBJECTID', () => {});
  const rows: any[] = []; let bad = 0, count = 0, counted = 0; let latest = 0; const yearsSeen = new Set<number>();
  for (const f of feats) {
    if (!f.geometry || !/LineString/.test(f.geometry.type)) { bad++; continue; }
    const p = f.properties, cy = Number(p.CURRENT_YEAR) || 0; latest = Math.max(latest, cy);
    const lines: LngLat[][] = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const aadtByYear: Record<number, number> = {};
    if (cy) { if (Number(p.CURRENT_AADT) > 0) aadtByYear[cy] = Number(p.CURRENT_AADT); for (let k = 1; k <= 9; k++) { const v = Number(p[`AADT_LAST_YEAR_${k}`]); if (v > 0) aadtByYear[cy - k] = v; } }
    const ys = Object.keys(aadtByYear).map(Number); ys.forEach(y => yearsSeen.add(y));
    const countYear = ys.length ? Math.max(...ys) : cy;
    const segKey = `DE|${p.ROADWAY_ID}|${p.BEG_MP}|${p.END_MP}`;
    const row = {
      id: segKey, segKey, stateCode: 'DE', lines, route: String(p.ROAD_NUMBER ?? '').trim(), routeType: 'Numbered Route', districtId: String(p.GROWTH_GROUP ?? ''), county: '',
      description: `${p.ROAD_NAME ?? ''} from ${p.BEG_BREAKPOINT_ID ?? ''}`.trim(), logmileStart: Number(p.BEG_MP) || 0, logmileEnd: Number(p.END_MP) || 0, lanes: 0, speedLimit: 0,
      functionalClass: 'Minor Arterial', // PLACEHOLDER: this layer has no functional class; do not use for class analysis
      aadtByYear, aadtCurrent: aadtByYear[countYear] ?? 0, countYear, hasCount: ys.length > 0, yearsCounted: ys.length,
      aadtBasis: 'two-way', facilityType: null, aadtFlag: null,
      extras: Object.fromEntries(DE_CORE.map(k => [k, p[k] ?? null])),
      commercialPercent: 0, commercialAadt: 0, singleUnitTrucks: 0, combinationTrucks: 0, kFactor: 0, dFactor: 0, peakHourVolume: 0,
    };
    count++; if (row.hasCount) counted++;
    if (opts.onRow) opts.onRow(row); else rows.push(row);
    if (opts.onYearRow) [...ys].sort((a, b) => b - a).forEach((y, i) => opts.onYearRow!(y, segKey, i === 0 ? { ...p, AADT: aadtByYear[y], YEAR: y } : { AADT: aadtByYear[y], YEAR: y }));
  }
  const years = [...yearsSeen].sort((a, b) => a - b);
  log(`  DE: ${count} sections (${bad} without line geometry); ${counted} with a count; years ${years[0]}-${years.at(-1)}`);
  return { rows, years, latest, count };
}
