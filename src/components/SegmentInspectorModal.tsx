import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  MapPin, 
  Truck, 
  Clock, 
  Calendar, 
  Layers, 
  Bookmark, 
  Download, 
  Activity, 
  TrendingUp, 
  CheckCircle2 
} from 'lucide-react';
import { TrafficSegment } from '../types/traffic';
import { trafficDb } from '../services/db';
import { queryDb } from '../services/queryDb';
import { downloadFile } from '../utils/exportUtils';

const isDesktop = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine) and (min-width: 1024px)').matches;
const label = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const GROUPS: [string, RegExp][] = [
  ['Lanes & cross-section', /lane|shoulder|median|width|operation|divided|facility|direction|^dir|typeroad|type_road|access|turn|parking|travelway_dir|log_direction/],
  ['Safety & crashes', /fatal|injur|crash|acc_|^acc|pdo|sideswipe|head_on|fixed_obj|off_road|wet|dry|safety|haz|rate|index/],
  ['Trucks & traffic factors', /truck|commercial|single_unit|combination|k_factor|dir_factor|pct_dh|future|aadt|^adt|count|roadway_aadt/],
  ['Pavement & condition', /surface|iri|psr|rutting|faulting|cracking|thickness|base|soil|year_last|overlay|rough|pavement|year_built|year_recon/],
];
const groupOf = (k: string) => GROUPS.find(([, re]) => re.test(k))?.[0] ?? 'Other attributes';
const fmt = (v: unknown) => (typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : String(Math.round(v * 100) / 100)) : String(v));

interface SegmentInspectorModalProps {
  segment: TrafficSegment | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const SegmentInspectorModal: React.FC<SegmentInspectorModalProps> = ({
  segment,
  onClose,
  onRefresh
}) => {
  // per-year statistics (history) and, on desktop only, every other source attribute; both load on demand by segment id
  const [hist, setHist] = useState<Record<string, any>[]>([]);
  const [attrs, setAttrs] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    setHist([]); setAttrs(null);
    if (!segment?.stateCode) return;
    let alive = true;
    queryDb.history(segment.stateCode, [segment.id]).then((h) => { if (alive) setHist(h[segment.id] ?? []); }).catch(() => {});
    if (isDesktop()) queryDb.attributes(segment.stateCode, [segment.id]).then((a) => { const rows = a[segment.id]; if (alive && rows?.length) setAttrs(rows[rows.length - 1]); }).catch(() => {});
    return () => { alive = false; };
  }, [segment?.id, segment?.stateCode]);

  const details = useMemo(() => {
    if (!segment) return [] as [string, [string, string][]][];
    const latest = hist.length ? hist[hist.length - 1] : {};
    const merged: Record<string, unknown> = { ...(attrs ?? {}), ...latest, ...(segment.core ?? {}) };
    for (const k of ['year', 'id', 'aadt', 'adt', 'adt_year']) delete merged[k];
    const by = new Map<string, [string, string][]>();
    for (const [k, v] of Object.entries(merged)) {
      if (v == null || v === '' || v === 0 && /^(source|flag)$/.test(k)) continue;
      const g = groupOf(k); (by.get(g) ?? by.set(g, []).get(g)!).push([label(k), fmt(v)]);
    }
    const order = [...GROUPS.map(([n]) => n), 'Other attributes'];
    return order.filter((g) => by.has(g)).map((g) => [g, by.get(g)!.sort((a, b) => a[0].localeCompare(b[0]))] as [string, [string, string][]]);
  }, [segment, hist, attrs]);

  if (!segment) return null;

  const handleArchive = async () => {
    await trafficDb.archiveSegment(segment, 'Archived via Segment Inspector Modal');
    onRefresh();
    alert(`Snapshot of ${segment.route} (${segment.county} Co.) saved to local database!`);
  };

  const handleExportDossier = () => {
    downloadFile(
      JSON.stringify(segment, null, 2),
      `Segment_${segment.route}_${segment.county}_Dossier.json`,
      'application/json'
    );
  };

  // Every year the source has (Missouri has 27), newest last. Older builds fall back to the fixed 7-year fields.
  const ah = segment.aadtHistory && Object.keys(segment.aadtHistory).length ? segment.aadtHistory : null;
  const historyYears: { year: string; aadt: number }[] = ah
    ? Object.entries(ah).map(([y, v]) => ({ year: y, aadt: v })).sort((x, y) => +x.year - +y.year)
    : [
        { year: '2018', aadt: segment.aadt2018 }, { year: '2019', aadt: segment.aadt2019 }, { year: '2020', aadt: segment.aadt2020 },
        { year: '2021', aadt: segment.aadt2021 }, { year: '2022', aadt: segment.aadt2022 }, { year: '2023', aadt: segment.aadt2023 },
        { year: '2024', aadt: segment.aadtCurrent },
      ];
  const latestYear = segment.countYear ?? (historyYears.length ? +historyYears[historyYears.length - 1].year : 0);
  const firstYear = historyYears.length ? historyYears[0].year : '';
  const sourceNote = segment.stateCode ? `${segment.stateCode} traffic archive` : 'Traffic archive';

  const maxHistoricalAadt = Math.max(...historyYears.map((h) => h.aadt), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
              segment.routeType === 'Interstate' ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-slate-800 text-slate-200'
            }`}>
              {segment.route}
            </span>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{segment.description}</h3>
              <span className="text-[11px] text-slate-400">
                {segment.county} County · Milepoint {Number(segment.logmileStart).toFixed(3)} to {Number(segment.logmileEnd).toFixed(3)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">{latestYear ? `${latestYear} AADT` : 'Current AADT'}</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                {segment.aadtCurrent.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">Vehicles per day</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">Commercial Trucks</span>
              <span className="text-lg font-bold font-mono text-amber-400 mt-0.5 block">
                {segment.commercialPercent}%
              </span>
              <span className="text-[10px] text-slate-500">{segment.commercialAadt.toLocaleString()} trucks/day</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">Peak Hour Volume</span>
              <span className="text-lg font-bold font-mono text-sky-400 mt-0.5 block">
                {segment.peakHourVolume ? segment.peakHourVolume.toLocaleString() : '—'}
              </span>
              <span className="text-[10px] text-slate-500">{segment.kFactor ? `K-factor: ${Math.round(segment.kFactor * 100)}%` : 'not in this source'}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-slate-400 text-[10px] block">Design Specs</span>
              <span className="text-base font-bold text-slate-200 mt-0.5 block">
                {segment.lanes} Lanes
              </span>
              <span className="text-[10px] text-slate-500">{segment.speedLimit} mph limit</span>
            </div>
          </div>

          {/* Historical Multi-Year AADT Bar Chart */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                {historyYears.length}-Year AADT Volume Trend ({firstYear} - {latestYear})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {sourceNote}
              </span>
            </div>

            <div className="h-44 flex items-end gap-1 pt-6 pb-2 border-b border-slate-800 overflow-x-auto">
              {historyYears.map((h) => {
                const heightPct = Math.round((h.aadt / maxHistoricalAadt) * 100);
                const isCurrent = +h.year === latestYear;
                const isCovid = h.year === '2020';

                return (
                  <div key={h.year} className="flex-1 min-w-[18px] flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-white pointer-events-none whitespace-nowrap">
                      {h.aadt.toLocaleString()} vpd
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isCurrent 
                          ? 'bg-emerald-500' 
                          : isCovid 
                            ? 'bg-slate-700' 
                            : 'bg-emerald-700/80 group-hover:bg-emerald-600'
                      }`}
                    />

                    <span className="text-[9px] text-slate-400 mt-2 font-mono text-center truncate w-full">
                      {historyYears.length > 14 ? h.year.slice(2) : h.year}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {(segment.aadtBasis || segment.aadtFlag) && (
            <div className={`rounded-lg border p-3 text-[11px] ${segment.aadtFlag ? 'bg-amber-950/40 border-amber-800 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
              {segment.aadtBasis && segment.aadtBasis !== 'unknown' && <div>AADT basis: <b>{segment.aadtBasis === 'two-way' ? 'two-way total (both directions)' : 'per direction'}</b>.</div>}
              {segment.aadtFlag && <div className="mt-1">Non-mainline section (ramp, frontage or connector): its AADT is often copied from the mainline, so treat it with care.</div>}
            </div>
          )}

          {hist.length > 1 && (() => {
            const prefer = ['aadt', 'through_lanes', 'total_lanes', 'number_of_lanes', 'avg_3yr_fatal', 'avg_3yr_injury', 'avg_3yr_pdo', 'actual_acc_rate', 'fatality_rate', 'injury_rate', 'percent_commercial', 'truckpercent'];
            const cols = prefer.filter((c) => hist.some((r) => r[c] != null));
            if (!cols.length) return null;
            return (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="font-bold text-slate-200 block mb-2">Year by year</span>
                <div className="overflow-auto max-h-56">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="text-slate-500 sticky top-0 bg-slate-950"><tr><th className="text-left pr-3 py-1">Year</th>{cols.map((c) => <th key={c} className="text-right px-2 py-1 whitespace-nowrap">{label(c)}</th>)}</tr></thead>
                    <tbody>{[...hist].reverse().map((r) => (
                      <tr key={r.year} className="border-t border-slate-800 text-slate-300"><td className="pr-3 py-1">{r.year}</td>{cols.map((c) => <td key={c} className="text-right px-2 py-1">{r[c] != null ? fmt(r[c]) : '-'}</td>)}</tr>))}</tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {details.map(([group, rows]) => (
            <div key={group} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="font-bold text-slate-200 block mb-2">{group}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {rows.map(([k, v]) => (<div key={k} className="flex items-center justify-between gap-3 text-[11px]"><span className="text-slate-400 truncate">{k}</span><span className="font-mono text-slate-200 text-right">{v}</span></div>))}
              </div>
            </div>
          ))}
          {!attrs && isDesktop() && segment.stateCode && (
            <p className="text-[10px] text-slate-500">Full source attributes (pavement, curves, grades, planning and more) appear here when the state's desktop attribute file is present.</p>
          )}

          {/* Commercial Classification Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-300 block">Truck Classification</span>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Single-Unit Trucks (Class 5-7):</span>
                <span className="font-mono font-bold text-slate-200">{segment.singleUnitTrucks ? `${segment.singleUnitTrucks.toLocaleString()} vpd` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Combination Semis (Class 8-13):</span>
                <span className="font-mono font-bold text-amber-400">{segment.combinationTrucks ? `${segment.combinationTrucks.toLocaleString()} vpd` : '—'}</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-300 block">Traffic Engineering Factors</span>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Directional Split (D-Factor):</span>
                <span className="font-mono font-bold text-slate-200">{segment.dFactor ? `${Math.round(segment.dFactor * 100)}% / ${100 - Math.round(segment.dFactor * 100)}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Functional Class:</span>
                <span className="font-mono text-slate-300">{segment.functionalClass}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleExportDossier}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Segment JSON</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs transition shadow-sm"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Archive Snapshot to Local DB</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
