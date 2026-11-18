// Arkansas native source: ARDOT's own GIS server (gis.ardot.gov). Segments come from the full road inventory (226k sections with lanes,
// shoulders, medians, pavement...); each is joined to its ADT count station by road id + milepoint (ADTLinear, ADT per year back to 1986).
import { getJson, pages, q } from './arcgis-source';
type LngLat = [number, number];
const ROOT = 'https://gis.ardot.gov/referenced/rest/services/SIR_TIS';
const INV = `${ROOT}/Road_Inventory_OnSystem/FeatureServer/2`, ADT = `${ROOT}/ADTLinear/FeatureServer/0`;
const FCLASS: Record<string, string> = { '1': 'Interstate', '2': 'Freeway & Expressway', '3': 'Other Principal Arterial', '4': 'Minor Arterial', '5': 'Major Collector', '6': 'Minor Collector', '7': 'Local' };
// RouteSign has no coded domain; 1/2/3 inferred (Interstate/US/State) from sample sections, anything else is a county or city road.
const SIGN: Record<string, [string, string]> = { '1': ['I-', 'Interstate'], '2': ['US-', 'US Highway'], '3': ['AR-', 'State Route'] };
export const ARDOT_CORE = ['AADT', 'YEAR', 'ADT', 'ADT_Year', 'TruckPercent', 'Direction', 'CountType', 'Total_Lanes', 'Travel_Lanes', 'Peak_Lanes', 'Counter_Peak_Lanes', 'Turn_Lanes_R', 'Turn_Lanes_L', 'TypeRoad', 'TypeOperation', 'MedianType', 'Median_Width', 'LaneWidth', 'RightShoulderWidth', 'LeftShoulderWidth', 'LOG_DIRECTION', 'Access', 'Speedlimit', 'NHS', 'SystemStatus'];

export async function fetchArdot(opts: { limit?: number; log?: (s: string) => void; onRow?: (row: any) => void; onYearRow?: (year: number, id: string, p: Record<string, any>) => void } = {}) {
  const log = opts.log ?? console.log;
  const quiet = () => {};
  // 1) count stations (attributes only)
  const adtRows = (await pages(ADT, '1=1', '*', false, 'OBJECTID', quiet)).map((f: any) => f.attributes);
  log(`  AR: ${adtRows.length} ADT count-station lines`);
  const byRoad = new Map<string, any[]>();
  for (const a of adtRows) { const k = String(a.AH_RoadID); (byRoad.get(k) ?? byRoad.set(k, []).get(k)!).push(a); }
  const yearCols: number[] = Object.keys(adtRows[0] ?? {}).map(k => /^year_(\d{4})$/.exec(k)).filter(Boolean).map(m => +m![1]).sort((a, b) => a - b);
  // columns run to 2050 (projections); only years up to the newest actual count (Year_ADT) are real
  const lastActual = Math.max(...adtRows.map((a: any) => Number(a.Year_ADT) || 0));
  yearCols.splice(0, yearCols.length, ...yearCols.filter(y => y <= lastActual));

  // 2) inventory sections with geometry
  const total = (await getJson(`${INV}/query?${q({ where: '1=1', returnCountOnly: true, f: 'json' })}`)).count as number;
  const want = opts.limit ? Math.min(total, opts.limit) : total;
  const rows: any[] = []; let joined = 0, bad = 0, count = 0, counted = 0;
  const handle = (f: any) => {
    if (!f.geometry || !/LineString/.test(f.geometry.type)) { bad++; return; }
    const p = f.properties;
    const lines: LngLat[][] = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const blm = Number(p.AH_BLM) || 0, elm = Number(p.AH_ELM) || 0, mid = (blm + elm) / 2;
    const st = (byRoad.get(String(p.AH_RoadID)) ?? []).filter(a => a.AH_BLM <= mid && mid <= a.AH_ELM).sort((a, b) => (a.AH_ELM - a.AH_BLM) - (b.AH_ELM - b.AH_BLM))[0];
    const segKey = `AR|${p.AH_RoadID}|${blm}|${elm}`; // road id + milepoints: stable across rebuilds
    const aadtByYear: Record<number, number | null> = {};
    if (st) { joined++; for (const y of yearCols) { const v = Number(st[`year_${y}`]) || 0; if (v > 0) aadtByYear[y] = v; } }
    const invAdt = Number(p.ADT) || 0, invYear = Number(p.ADT_Year) || 0;
    if (invAdt > 0 && invYear && aadtByYear[invYear] === undefined) aadtByYear[invYear] = invAdt;
    const ys = Object.entries(aadtByYear).filter(([, v]) => (v as number) > 0).map(([y]) => +y);
    const countYear = ys.length ? Math.max(...ys) : (invYear || yearCols.at(-1)!);
    const aadt = (aadtByYear[countYear] as number) || 0;
    const sign = SIGN[String(p.RouteSign)] ?? ['', 'Numbered Route'];
    const tp = st ? Number(st[`TruckPercent_${countYear}`]) || Number(st.TruckPercent) || 0 : 0;
    const id = segKey;
    const row = {
      id, segKey, stateCode: 'AR', lines, route: `${sign[0]}${p.AH_Route ?? ''}`.trim(), routeType: sign[1],
      districtId: String(p.AH_District ?? ''), county: String(p.AH_County ?? ''), description: `${p.AH_Route ?? ''} section ${p.AH_Section ?? ''}`.trim(),
      logmileStart: blm, logmileEnd: elm, lanes: Number(p.Total_Lanes) || Number(p.Travel_Lanes) || 0, speedLimit: Number(p.Speedlimit) || 0,
      functionalClass: FCLASS[String(p.FunctionalClass)] ?? 'Local', aadtByYear, aadtCurrent: aadt, countYear, hasCount: ys.length > 0, yearsCounted: ys.length,
      aadtBasis: 'unknown', facilityType: p.TypeRoad ?? null, aadtFlag: null,
      extras: { ...Object.fromEntries(ARDOT_CORE.map(k => [k, p[k] ?? st?.[k] ?? null])), TruckPercent: tp || null, Direction: st?.Direction ?? null, CountType: st?.CountType ?? null },
      commercialPercent: tp, commercialAadt: Math.round(aadt * tp / 100), singleUnitTrucks: 0, combinationTrucks: 0, kFactor: 0, dFactor: 0, peakHourVolume: 0,
    };
    count++; if (row.hasCount) counted++;
    if (opts.onRow) opts.onRow(row); else rows.push(row); // onRow streams sections out instead of holding 226k in memory
    // inventory attributes are static: write them once (newest year), then only the year-varying values
    if (opts.onYearRow) [...ys].sort((a, b) => b - a).forEach((y, i) => opts.onYearRow!(y, id, { ...(i === 0 ? { ...p, ...(st ? { Direction: st.Direction, CountType: st.CountType, ATR_Type: st.ATR_Type } : {}) } : {}), AADT: aadtByYear[y], TruckPercent: st ? (Number(st[`TruckPercent_${y}`]) || null) : null, YEAR: y }));
  };
  const PAGE = 2000;
  for (let off = 0; off < want; off += PAGE) {
    const j = await getJson(`${INV}/query?${q({ where: '1=1', outFields: '*', returnGeometry: true, outSR: 4326, orderByFields: 'OBJECTID', resultOffset: off, resultRecordCount: Math.min(PAGE, want - off), f: 'geojson' })}`);
    for (const f of j.features) handle(f); // one page at a time, then dropped
    if ((off / PAGE) % 10 === 0) log(`    inventory ${Math.min(off + PAGE, want)}/${want}`);
  }

  log(`  AR: ${count} sections (${bad} without line geometry); ${joined} joined to a count station; ${counted} have a count in some year`);
  return { rows, years: yearCols, latest: yearCols.at(-1)!, count };
}
