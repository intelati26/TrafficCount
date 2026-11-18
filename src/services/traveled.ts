// Segment tracker: roads you have travelled, marked by hand. Kept in localStorage (your data only, never in the Parquet files) and
// carried in the notes & settings sync file. A mark covers BOTH directions: it is keyed by state + route + milepoint span, which the
// opposing directional segments share, and it also remembers the exact segment key it was made on.
import { useSyncExternalStore } from 'react';
import type { TrafficSegment } from '../types/traffic';
import { laneUtilization } from '../utils/laneUtilization';

const KEY = 'tm_traveled';
export interface TravelMark {
  id: string; // direction-free span key (or the segment key when milepoints are unavailable)
  segKey?: string;
  state: string; route: string; fclass?: string;
  mpStart: number; mpEnd: number; miles: number;
  aadt: number; vph: number; // snapshot at marking time, for statistics
  date: string; note?: string;
  updatedAt: string;
  deleted?: boolean; // tombstone, so a merge from another device cannot resurrect it
}

const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
export const spanKey = (s: TrafficSegment): string => {
  const a = Math.min(+s.logmileStart || 0, +s.logmileEnd || 0), b = Math.max(+s.logmileStart || 0, +s.logmileEnd || 0);
  const st = s.stateCode ?? '';
  return b > a ? `${st}|${s.route}|${r2(a)}|${r2(b)}` : `${st}|${s.segKey ?? s.id}`;
};

let cache: TravelMark[] | null = null;
let version = 0;
const listeners = new Set<() => void>();
const read = (): TravelMark[] => {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { cache = []; }
  if (!Array.isArray(cache)) cache = [];
  return cache;
};
const write = (m: TravelMark[]) => {
  cache = m; version++;
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage unavailable: marks last for this session only */ }
  listeners.forEach(l => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

let idx: { v: number; set: Set<string> } = { v: -1, set: new Set() };
const index = (): Set<string> => {
  if (idx.v !== version) { idx = { v: version, set: new Set(read().filter(m => !m.deleted).flatMap(m => (m.segKey ? [m.id, m.segKey] : [m.id]))) }; }
  return idx.set;
};

export const travelled = {
  /** True when this segment (or its opposite-direction twin) is marked. */
  has(s: TrafficSegment): boolean { const i = index(); return i.size > 0 && (i.has(spanKey(s)) || (!!s.segKey && i.has(s.segKey))); },
  all(): TravelMark[] { return read().filter(m => !m.deleted); },
  raw(): TravelMark[] { return read(); },
  mark(segs: TrafficSegment[], opts: { date?: string; note?: string } = {}) {
    const now = new Date().toISOString(), next = new Map(read().map(m => [m.id, m]));
    for (const s of segs) {
      const id = spanKey(s), prev = next.get(id);
      if (prev && !prev.deleted) continue;
      const u = laneUtilization(s);
      next.set(id, {
        id, segKey: s.segKey, state: s.stateCode ?? '', route: s.route, fclass: String(s.functionalClass ?? ''),
        mpStart: +s.logmileStart || 0, mpEnd: +s.logmileEnd || 0, miles: s.mileageLength ?? Math.abs((+s.logmileEnd || 0) - (+s.logmileStart || 0)),
        aadt: s.aadtCurrent || 0, vph: u?.vphPerLane ?? 0, date: opts.date ?? now.slice(0, 10), note: opts.note, updatedAt: now,
      });
    }
    write([...next.values()]);
  },
  unmark(segs: TrafficSegment[]) {
    const now = new Date().toISOString(), ids = new Set(segs.flatMap(s => [spanKey(s)]));
    write(read().map(m => (ids.has(m.id) || (m.segKey && segs.some(s => s.segKey === m.segKey))) && !m.deleted ? { ...m, deleted: true, updatedAt: now } : m));
  },
  /** Merge marks from a sync file: newest updatedAt wins per mark. Returns how many changed. */
  merge(incoming: TravelMark[], dryRun = false): number {
    const next = new Map(read().map(m => [m.id, m]));
    let n = 0;
    for (const m of incoming) {
      if (!m?.id || !m.updatedAt) continue;
      const cur = next.get(m.id);
      if (!cur || m.updatedAt > cur.updatedAt) { n++; next.set(m.id, m); }
    }
    if (!dryRun && n) write([...next.values()]);
    return n;
  },
};

/** Re-renders when marks change; returns the version (use as a memo dependency). */
export function useTravelVersion(): number {
  return useSyncExternalStore(subscribe, () => { read(); return version; });
}

export interface TravelStats { marks: number; miles: number; byState: [string, number][]; byClass: [string, number][]; busiestAadt: TravelMark[]; busiestVph: TravelMark[]; routes: [string, number][] }
export function travelStats(marks = travelled.all()): TravelStats {
  const sum = (key: (m: TravelMark) => string) => { const t = new Map<string, number>(); for (const m of marks) t.set(key(m), (t.get(key(m)) ?? 0) + m.miles); return [...t].sort((a, b) => b[1] - a[1]); };
  return {
    marks: marks.length, miles: marks.reduce((a, m) => a + m.miles, 0),
    byState: sum(m => m.state), byClass: sum(m => m.fclass || 'Unknown'), routes: sum(m => `${m.state} ${m.route}`).slice(0, 15),
    busiestAadt: [...marks].sort((a, b) => b.aadt - a.aadt).slice(0, 10),
    busiestVph: [...marks].filter(m => m.vph > 0).sort((a, b) => b.vph - a.vph).slice(0, 10),
  };
}
