import type { TrafficSegment } from '../types/traffic';

/** Typical per-lane capacity (veh/hr/lane) used as the 100% mark. */
export const LANE_CAPACITY_VPH = 2000;
/** Peak-direction share assumed when a segment has no directional factor. */
export const ASSUMED_D = 0.55;

export interface LaneUtilization {
  /** Peak-hour volume in the busier direction, per lane in that direction (veh/hr/lane). */
  vphPerLane: number;
  /** vphPerLane / LANE_CAPACITY_VPH */
  utilization: number;
  lanesPerDirection: number;
  /** True when the directional factor was assumed or the lane count was odd (so the split is approximate). */
  approximate: boolean;
}

/**
 * Peak-hour volume per lane in the peak direction: AADT x K x D / (lanes in that direction).
 * One-way roads carry everything in one direction (D = 1, all lanes). Two-way roads split lanes evenly.
 * Returns null without a K factor, an AADT, or a lane count.
 */
export function laneUtilization(s: Pick<TrafficSegment, 'aadtCurrent' | 'kFactor' | 'dFactor' | 'lanes'> & { core?: Record<string, string | number> }): LaneUtilization | null {
  const lanes = Number(s.lanes) || 0;
  if (!(s.aadtCurrent > 0) || !(s.kFactor > 0) || lanes < 1) return null;
  const oneWay = Number(s.core?.facility_type) === 1;
  const d = oneWay ? 1 : s.dFactor > 0 ? s.dFactor : ASSUMED_D;
  const perDir = oneWay ? lanes : lanes / 2;
  if (perDir < 1) return null;
  const vph = (s.aadtCurrent * s.kFactor * d) / perDir;
  return {
    vphPerLane: Math.round(vph),
    utilization: vph / LANE_CAPACITY_VPH,
    lanesPerDirection: perDir,
    approximate: (!oneWay && !(s.dFactor > 0)) || (!oneWay && lanes % 2 === 1),
  };
}

/** SQL for the same figure over the main file (null when a needed column is missing). */
export function laneUtilizationSql(cols: Set<string>): string | null {
  if (!['aadt_cur', 'k_factor', 'd_factor', 'lanes'].every(c => cols.has(c))) return null;
  const oneWay = cols.has('facility_type') ? 'facility_type = 1' : 'false';
  return `(CASE WHEN aadt_cur > 0 AND k_factor > 0 AND lanes >= 1 THEN aadt_cur * k_factor * (CASE WHEN ${oneWay} THEN 1.0 ELSE coalesce(nullif(d_factor, 0), ${ASSUMED_D}) END) / (CASE WHEN ${oneWay} THEN lanes ELSE lanes / 2.0 END) END)`;
}
