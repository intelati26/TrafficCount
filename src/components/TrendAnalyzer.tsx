import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Truck, Download, Info, Loader2 } from 'lucide-react';
import { queryDb, CorridorTrend } from '../services/queryDb';
import { downloadFile } from '../utils/exportUtils';

interface TrendAnalyzerProps { stateCode: string; stateName: string; agency: string }

const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`;

// Year-over-year change by route, computed from the built data. Needs a source with several years: states built from a native source
// with history (Missouri, Arkansas, Delaware, Mississippi). HPMS-only states hold the latest year only and show an explanation instead.
export const TrendAnalyzer: React.FC<TrendAnalyzerProps> = ({ stateCode, stateName, agency }) => {
  const [years, setYears] = useState<number[] | null>(null);
  const [base, setBase] = useState<number>(0);
  const [compare, setCompare] = useState<number>(0);
  const [rows, setRows] = useState<CorridorTrend[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    let alive = true; setYears(null); setRows([]);
    queryDb.years(stateCode).then((y) => {
      if (!alive) return;
      setYears(y);
      if (y.length > 1) {
        const latest = y[y.length - 1], earlier = y.filter((v) => v < latest);
        setCompare(latest);
        setBase(earlier.reduce((best, v) => (Math.abs(v - 2019) < Math.abs(best - 2019) ? v : best), earlier[0])); // default baseline: the year closest to 2019
      }
    }).catch(() => alive && setYears([]));
    return () => { alive = false; };
  }, [stateCode]);

  useEffect(() => {
    if (!years || years.length < 2 || !base || !compare || base === compare) { setRows([]); return; }
    let alive = true; setBusy(true);
    queryDb.corridorTrends(stateCode, base, compare).then((r) => { if (alive) { setRows(r); setSelected(r[0]?.route ?? ''); } }).catch(() => alive && setRows([])).finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [stateCode, years, base, compare]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const w = rows.reduce((a, r) => a + r.baseAadt * r.miles, 0), wc = rows.reduce((a, r) => a + r.compareAadt * r.miles, 0);
    const tb = rows.reduce((a, r) => a + r.truckVolumeBase * r.miles, 0), tc = rows.reduce((a, r) => a + r.truckVolumeCompare * r.miles, 0);
    const top = [...rows].filter((r) => r.miles >= 20).sort((a, b) => b.percentChange - a.percentChange)[0] ?? rows[0];
    return { growth: w ? Math.round(((wc - w) / w) * 1000) / 10 : 0, truck: tb ? Math.round(((tc - tb) / tb) * 1000) / 10 : 0, top };
  }, [rows]);
  const sel = rows.find((r) => r.route === selected) ?? rows[0];

  const exportReport = () => {
    const text = [
      '==============================================================',
      `${stateName.toUpperCase()} (${agency}) - ROUTE TRAFFIC VOLUME TREND`,
      `${base} vs ${compare}, length-weighted, segments counted in both years. GENERATED: ${new Date().toLocaleDateString()}`,
      '==============================================================\n',
      ...rows.map((c) => `ROUTE: ${c.route} (${c.miles} mi, ${c.sections} sections)\n  ${c.baseYear} AADT: ${c.baseAadt.toLocaleString()}\n  ${c.compareYear} AADT: ${c.compareAadt.toLocaleString()}\n  Change: ${signed(c.absoluteChange)} vpd (${signed(c.percentChange)}%)\n  Status: ${c.status}\n--------------------------------------------------------------`),
    ].join('\n');
    downloadFile(text, `${stateCode}_Route_Trend_${base}_${compare}.txt`, 'text/plain');
  };

  const header = (
    <div className="p-5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" />{agency} Multi-Year Traffic Trend Analyzer</h2>
        <p className="text-xs text-slate-400 mt-1">Change in AADT by route for {stateName}, computed from the built data.</p>
      </div>
      {years && years.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-slate-400">From
            <select value={base} onChange={(e) => setBase(+e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200">{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label className="flex items-center gap-1.5 text-slate-400">to
            <select value={compare} onChange={(e) => setCompare(+e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200">{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <button onClick={exportReport} disabled={!rows.length} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded font-medium"><Download className="w-3.5 h-3.5" />Export report</button>
        </div>
      )}
    </div>
  );

  if (years === null) return <div className="h-full bg-slate-950 text-slate-100">{header}<p className="p-6 text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading {stateName} data…</p></div>;
  if (years.length < 2) return (
    <div className="h-full bg-slate-950 text-slate-100">{header}
      <div className="p-6 max-w-2xl text-xs text-slate-300 space-y-2">
        <p className="flex items-start gap-2"><Info className="w-4 h-4 text-sky-400 shrink-0" />{years.length === 1 ? `${stateName}'s data holds a single year (${years[0]}).` : `No built data for ${stateName}.`} Year-over-year trends need a source with several years of counts. Missouri, Arkansas, Delaware and Mississippi have that; the other states come from FHWA's HPMS, which publishes one snapshot at a time and cannot be linked across years.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {header}
      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {busy && <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating…</p>}
        {!busy && !rows.length && <p className="text-xs text-amber-300">No route has counts in both {base} and {compare}. Choose two other years.</p>}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><span className="text-xs text-slate-400 block">Average change, top {rows.length} routes ({base}–{compare})</span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${stats.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{signed(stats.growth)}%</span><span className="text-[11px] text-slate-500">length-weighted AADT</span></div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><span className="text-xs text-slate-400 block">Truck volume change</span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">{signed(stats.truck)}%</span><span className="text-[11px] text-slate-500">estimated from each section's latest truck share</span></div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><span className="text-xs text-slate-400 block">Fastest-growing route (20+ miles)</span>
              <span className="text-xl font-bold text-slate-100 mt-1 block">{stats.top.route}</span><span className="text-[11px] text-emerald-400 font-semibold">{signed(stats.top.percentChange)}% AADT</span></div>
          </div>
        )}
        {rows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((c) => (
              <div key={c.route} onClick={() => setSelected(c.route)} className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition space-y-3 ${sel?.route === c.route ? 'border-emerald-500/70 shadow-lg' : 'border-slate-800 hover:border-slate-700'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><h4 className="font-bold text-slate-100 text-sm">{c.route}</h4><span className="text-xs text-slate-400">{c.miles} mi · {c.sections.toLocaleString()} sections</span></div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${c.status === 'Heavy Growth' ? 'bg-amber-950 border-amber-800 text-amber-300' : c.status === 'Decline' ? 'bg-red-950 border-red-800 text-red-300' : 'bg-emerald-950 border-emerald-800 text-emerald-300'}`}>{c.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                  <div><span className="text-[11px] text-slate-500 block">{c.baseYear}</span><span className="text-base font-bold font-mono text-slate-300">{c.baseAadt.toLocaleString()}</span></div>
                  <div className="text-right"><span className="text-[11px] text-slate-500 block">{c.compareYear}</span>
                    <div className="flex items-center justify-end gap-1.5"><span className="text-base font-bold font-mono text-emerald-400">{c.compareAadt.toLocaleString()}</span>
                      <span className={`text-xs font-mono flex items-center gap-0.5 ${c.percentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{c.percentChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{signed(c.percentChange)}%</span></div></div>
                </div>
                {c.truckVolumeCompare > 0 && (
                  <div className="bg-slate-950 rounded-lg p-2.5 flex items-center justify-between text-xs border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-amber-400" />Truck volume (est.)</span>
                    <span className="font-mono font-bold text-amber-400">{c.truckVolumeBase.toLocaleString()} → {c.truckVolumeCompare.toLocaleString()}/day</span>
                  </div>)}
              </div>))}
          </div>)}
        {sel && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-100">{sel.route}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><span className="text-slate-400 block">Net daily change</span><span className="text-lg font-bold font-mono text-emerald-400">{signed(sel.absoluteChange)} vpd</span></div>
              <div><span className="text-slate-400 block">Length counted in both years</span><span className="text-lg font-bold font-mono text-slate-200">{sel.miles} mi</span></div>
              <div><span className="text-slate-400 block">Sections</span><span className="text-lg font-bold font-mono text-slate-200">{sel.sections.toLocaleString()}</span></div>
            </div>
            <p className="text-[11px] text-slate-500">Only sections with a count in both {sel.baseYear} and {sel.compareYear} are used, weighted by length. Segment boundaries changed over the years, so a route's change reflects the sections that exist in both.</p>
          </div>)}
      </div>
    </div>
  );
};
