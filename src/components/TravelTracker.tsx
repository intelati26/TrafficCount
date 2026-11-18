import React, { useRef, useState } from 'react';
import { Route, Download, Upload, Trash2 } from 'lucide-react';
import { travelled, travelStats, useTravelVersion, TravelMark } from '../services/traveled';
import { downloadFile } from '../utils/exportUtils';

const mi = (n: number) => `${Math.round(n * 10) / 10} mi`;

export const TravelTracker: React.FC = () => {
  useTravelVersion();
  const marks = travelled.all();
  const st = travelStats(marks);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => downloadFile(JSON.stringify({ app: 'traffic-archive', kind: 'travelled', marks: travelled.raw() }), `travelled_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const j = JSON.parse(String(r.result)); const n = travelled.merge(j.marks ?? []); setMsg(`Merged ${n} marks.`); } catch { setMsg('Not a travelled-segments file.'); } };
    r.readAsText(f); if (fileRef.current) fileRef.current.value = '';
  };
  const remove = (m: TravelMark) => travelled.unmark([{ stateCode: m.state, route: m.route, logmileStart: m.mpStart, logmileEnd: m.mpEnd, segKey: m.segKey, id: m.id } as any]);

  const Bar = ({ rows }: { rows: [string, number][] }) => {
    const max = Math.max(...rows.map(r => r[1]), 1);
    return <div className="space-y-1">{rows.map(([k, v]) => (
      <div key={k} className="flex items-center gap-2 text-[11px]"><span className="w-28 truncate text-slate-300" title={k}>{k}</span>
        <div className="flex-1 h-2 bg-slate-800 rounded"><div className="h-2 rounded bg-fuchsia-500" style={{ width: `${(v / max) * 100}%` }} /></div>
        <span className="w-16 text-right font-mono text-slate-400">{mi(v)}</span></div>))}</div>;
  };
  const Top = ({ rows, f }: { rows: TravelMark[]; f: (m: TravelMark) => string }) => (
    <ol className="space-y-1 text-[11px]">{rows.map(m => (<li key={m.id} className="flex justify-between gap-2"><span className="text-slate-300 truncate">{m.state} {m.route} · mp {m.mpStart.toFixed(1)}–{m.mpEnd.toFixed(1)}</span><span className="font-mono text-fuchsia-300">{f(m)}</span></li>))}</ol>
  );

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 text-xs text-slate-300 space-y-5 max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Route className="w-5 h-5 text-fuchsia-400" /><h2 className="text-base font-bold text-slate-100">Travelled segments</h2></div>
        <div className="flex items-center gap-2">
          <button onClick={exportJson} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded"><Download className="w-3.5 h-3.5" />Export</button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded"><Upload className="w-3.5 h-3.5" />Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
        </div>
      </div>
      {msg && <p className="text-emerald-400">{msg}</p>}
      <p className="text-slate-400">Mark a road from the segment inspector or the corridor drawer on the map. A mark covers both directions, and miles are counted once. Marks live on this device and travel in the notes &amp; settings file.</p>
      {marks.length === 0 ? <p className="text-slate-500">Nothing marked yet.</p> : (<>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3"><span className="text-slate-400 text-[10px] block">Segments</span><span className="text-lg font-bold font-mono text-fuchsia-300">{st.marks.toLocaleString()}</span></div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3"><span className="text-slate-400 text-[10px] block">Miles travelled</span><span className="text-lg font-bold font-mono text-fuchsia-300">{mi(st.miles)}</span></div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3"><span className="text-slate-400 text-[10px] block">States</span><span className="text-lg font-bold font-mono text-fuchsia-300">{st.byState.length}</span></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <section><h3 className="font-semibold text-slate-200 mb-2">By state</h3><Bar rows={st.byState} /></section>
          <section><h3 className="font-semibold text-slate-200 mb-2">By functional class</h3><Bar rows={st.byClass} /></section>
          <section><h3 className="font-semibold text-slate-200 mb-2">Routes</h3><Bar rows={st.routes} /></section>
          <section><h3 className="font-semibold text-slate-200 mb-2">Busiest driven (AADT)</h3><Top rows={st.busiestAadt} f={m => m.aadt.toLocaleString()} /></section>
          <section><h3 className="font-semibold text-slate-200 mb-2">Highest peak vph/lane</h3><Top rows={st.busiestVph} f={m => `${m.vph.toLocaleString()} vph`} /></section>
        </div>
        <section>
          <h3 className="font-semibold text-slate-200 mb-2">All marks</h3>
          <div className="max-h-72 overflow-auto border border-slate-800 rounded-lg divide-y divide-slate-800">
            {marks.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(m => (
              <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="truncate">{m.state} {m.route} · mp {m.mpStart.toFixed(2)}–{m.mpEnd.toFixed(2)} · {m.date}</span>
                <button onClick={() => remove(m)} className="text-slate-500 hover:text-red-400" title="Unmark"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>))}
          </div>
        </section>
      </>)}
    </div>
  );
};
