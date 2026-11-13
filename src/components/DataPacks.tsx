import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DownloadCloud, FolderDown, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { queryDb, ManifestFile } from '../services/queryDb';
import { importFiles, removeLocalState, localSupported } from '../services/localData';

// Download built states to disk for off-app use or to copy to another device. Files are streamed straight to a chosen folder
// (File System Access API) so a 70 MB state never sits in memory; browsers without it fall back to one download per file.
// Tiers: seg + hist (traffic, crashes, lanes, direction) go to every build; attr (every other source field) is desktop only.

interface StatePack { state: string; seg?: ManifestFile; hist?: ManifestFile; attr?: ManifestFile; built: boolean; local?: boolean }
const mb = (b: number) => (b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : (b / 1e6).toFixed(b < 1e7 ? 1 : 0) + ' MB');
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine) and (min-width: 1024px)').matches;
const hasFolderPicker = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const DataPacks: React.FC = () => {
  const [files, setFiles] = useState<ManifestFile[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [withAttr, setWithAttr] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string }>({ done: 0, total: 0, current: '' });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<{ done: number; total: number; name: string } | null>(null);
  const desktop = isDesktop();

  useEffect(() => { queryDb.manifestFiles().then(setFiles).catch(() => setFiles([])); }, []);

  const packs = useMemo<StatePack[]>(() => {
    const by = new Map<string, StatePack>();
    for (const f of files ?? []) {
      if (f.kind !== 'seg' && f.kind !== 'hist' && f.kind !== 'attr') continue;
      const p = by.get(f.state) ?? { state: f.state, built: false };
      (p as any)[f.kind] = f;
      if (f.kind === 'seg') { p.built = !!f.source; p.local = !!f.local; } // no source = bundled sample data, nothing worth downloading
      by.set(f.state, p);
    }
    return [...by.values()].sort((a, b) => Number(b.built) - Number(a.built) || a.state.localeCompare(b.state));
  }, [files]);

  const localPacks = packs.filter(p => p.local);
  const doImport = async (list: FileList | null) => {
    if (!list?.length) return;
    setMsg(null); setImporting({ done: 0, total: 1, name: '' });
    try {
      const r = await importFiles([...list], (done, total, name) => setImporting({ done, total, name }));
      await queryDb.reload();
      setFiles(await queryDb.manifestFiles());
      setMsg({ text: `Imported ${r.imported.length} file(s)${r.skipped.length ? `; skipped ${r.skipped.length} (names must look like seg_AR.parquet)` : ''}. Reloading so the app picks them up…`, ok: r.imported.length > 0 });
      if (r.imported.length) setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) { setMsg({ text: e?.message ?? 'Import failed.', ok: false }); }
    finally { setImporting(null); if (importRef.current) importRef.current.value = ''; }
  };
  const removeLocal = async (state: string) => {
    if (!window.confirm(`Remove the ${state} data stored on this device?`)) return;
    await removeLocalState(state); await queryDb.reload(); setFiles(await queryDb.manifestFiles()); setMsg({ text: `Removed ${state} from this device.`, ok: true });
  };

  const chosen = packs.filter(p => picked.has(p.state) && !p.local);
  const listFor = (p: StatePack) => [p.seg, p.hist, withAttr && desktop ? p.attr : undefined].filter(Boolean) as ManifestFile[];
  const totalBytes = chosen.reduce((a, p) => a + listFor(p).reduce((x, f) => x + f.bytes, 0), 0);
  const toggle = (s: string) => setPicked(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const download = async () => {
    if (!chosen.length) return;
    setBusy(true); setMsg(null);
    const ac = new AbortController(); abort.current = ac;
    const list = chosen.flatMap(listFor);
    const sub = { built: new Date().toISOString(), files: list };
    let done = 0; setProgress({ done: 0, total: totalBytes, current: '' });
    try {
      if (hasFolderPicker()) {
        const root = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        for (const f of list) {
          setProgress(p => ({ ...p, current: f.file }));
          const parts = f.file.split('/'); let dir = root;
          for (const d of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(d, { create: true });
          const out = await (await dir.getFileHandle(parts.at(-1)!, { create: true })).createWritable();
          const res = await fetch(queryDb.dataBase + f.file, { signal: ac.signal });
          if (!res.ok || !res.body) throw new Error(`${f.file}: HTTP ${res.status}`);
          let got = 0;
          await res.body.pipeThrough(new TransformStream({ transform(chunk, c) { got += chunk.length; done += chunk.length; setProgress(p => ({ ...p, done })); c.enqueue(chunk); } })).pipeTo(out);
          if (got !== f.bytes) throw new Error(`${f.file}: received ${got} bytes, manifest says ${f.bytes}`);
        }
        const mh = await (await root.getFileHandle('manifest.json', { create: true })).createWritable();
        await mh.write(JSON.stringify(sub, null, 1)); await mh.close();
        setMsg({ text: `Saved ${list.length} files (${mb(totalBytes)}) and manifest.json. Copy the folder to another device's data/q folder to use it there.`, ok: true });
      } else {
        // fallback: one browser download per file (flattened names) plus the manifest
        for (const f of list) {
          setProgress(p => ({ ...p, current: f.file }));
          const res = await fetch(queryDb.dataBase + f.file, { signal: ac.signal });
          if (!res.ok) throw new Error(`${f.file}: HTTP ${res.status}`);
          const blob = await res.blob();
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.file.replace(/\//g, '_'); a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 10_000); done += f.bytes; setProgress(p => ({ ...p, done }));
        }
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(sub, null, 1)], { type: 'application/json' })); a.download = 'manifest.json'; a.click();
        setMsg({ text: `Downloaded ${list.length} files individually (this browser cannot save into a folder). Files are named dir_STATE.parquet; put them back into seg/, hist/, attr/ folders.`, ok: true });
      }
    } catch (e: any) {
      setMsg({ text: e?.name === 'AbortError' ? 'Download cancelled.' : e?.message ?? 'Download failed.', ok: false });
    } finally { setBusy(false); abort.current = null; }
  };

  const pct = progress.total ? Math.min(100, Math.round((100 * progress.done) / progress.total)) : 0;
  return (
    <div className="h-full overflow-auto bg-slate-950 text-slate-100 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2"><DownloadCloud className="w-5 h-5 text-emerald-400" /><h2 className="text-base font-bold">Data Packs</h2></div>
        <p className="text-xs text-slate-400 mt-1">Save built states to disk for off-app use or to copy to another device. Core files (traffic, crashes, lanes, direction, per-year history) are in every pack; the full attribute files (pavement, curves, grades, planning and the rest) are desktop only.</p>
      </div>

      {localSupported() && (
        <div className="border border-slate-800 rounded-lg p-3 space-y-2 bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-xs">On this device</span>
            <input ref={importRef} type="file" multiple accept=".parquet,.json,application/json" className="hidden" onChange={(e) => doImport(e.target.files)} />
            <button onClick={() => importRef.current?.click()} disabled={!!importing} className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-xs font-medium">Import data pack…</button>
            <span className="text-[11px] text-slate-400">Choose the files a Data Pack saved (seg_XX.parquet, hist_XX.parquet … and manifest.json). They are kept on this device and read in place.</span>
          </div>
          {importing && (<div className="space-y-1"><div className="h-2 bg-slate-800 rounded overflow-hidden"><div className="h-full bg-sky-500" style={{ width: Math.min(100, Math.round((100 * importing.done) / Math.max(importing.total, 1))) + '%' }} /></div><p className="text-[11px] text-slate-400">{importing.name} · {mb(importing.done)} of {mb(importing.total)}</p></div>)}
          {localPacks.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              {localPacks.map(p => (<span key={p.state} className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700">{p.state} · {mb((p.seg?.bytes ?? 0) + (p.hist?.bytes ?? 0) + (p.attr?.bytes ?? 0))}<button onClick={() => removeLocal(p.state)} className="text-slate-400 hover:text-red-300" title="Remove from this device">✕</button></span>))}
            </div>)}
        </div>
      )}

      {files === null && <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading manifest…</p>}
      {files !== null && !packs.length && <p className="text-xs text-amber-300">No built data found in /data/q/. Build states with scripts/build-data.ts first.</p>}

      {packs.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button onClick={() => setPicked(new Set(packs.filter(p => p.built).map(p => p.state)))} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">Select all built</button>
            <button onClick={() => setPicked(new Set())} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">Clear</button>
            <label className={`flex items-center gap-1.5 ${desktop ? '' : 'opacity-50'}`} title={desktop ? '' : 'Full attributes are desktop only'}>
              <input type="checkbox" disabled={!desktop} checked={withAttr && desktop} onChange={e => setWithAttr(e.target.checked)} /> Include full attributes (desktop only)
            </label>
            <span className="text-slate-400 ml-auto">{chosen.length} selected · {mb(totalBytes)}</span>
            {busy ? (
              <button onClick={() => abort.current?.abort()} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900 hover:bg-red-800 border border-red-700"><X className="w-3.5 h-3.5" /> Cancel</button>
            ) : (
              <button onClick={download} disabled={!chosen.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 font-medium"><FolderDown className="w-3.5 h-3.5" /> {hasFolderPicker() ? 'Save to folder…' : 'Download files'}</button>
            )}
          </div>

          {busy && (
            <div className="space-y-1"><div className="h-2 bg-slate-800 rounded overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: pct + '%' }} /></div>
              <p className="text-[11px] text-slate-400">{pct}% · {mb(progress.done)} of {mb(progress.total)} · {progress.current}</p></div>
          )}
          {msg && <p className={`text-xs flex items-start gap-1.5 ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}{msg.text}</p>}

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-slate-400"><tr><th className="p-2 w-8"></th><th className="p-2 text-left">State</th><th className="p-2 text-right">Segments</th><th className="p-2 text-right">Core</th><th className="p-2 text-right">History</th><th className="p-2 text-right">Attributes</th><th className="p-2 text-left">Source</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {packs.map(p => (
                  <tr key={p.state} className={p.built ? 'hover:bg-slate-900/70' : 'opacity-50'}>
                    <td className="p-2"><input type="checkbox" disabled={!p.built || busy || p.local} checked={picked.has(p.state)} onChange={() => toggle(p.state)} title={p.local ? 'Stored on this device' : ''} /></td>
                    <td className="p-2 font-semibold">{p.state}</td>
                    <td className="p-2 text-right font-mono">{p.seg ? p.seg.rows.toLocaleString() : '-'}</td>
                    <td className="p-2 text-right font-mono">{p.seg ? mb(p.seg.bytes) : '-'}</td>
                    <td className="p-2 text-right font-mono">{p.hist ? mb(p.hist.bytes) : '-'}</td>
                    <td className="p-2 text-right font-mono">{p.attr ? mb(p.attr.bytes) : '-'}</td>
                    <td className="p-2 text-slate-400 truncate max-w-[16rem]">{p.local ? 'on this device' : p.built ? (p.seg?.source ?? '').replace(/^https?:\/\//, '') : 'bundled sample data (not downloadable)'}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">Each file's size is checked against the manifest after it is saved. SHA-256 hashes are in manifest.json for a stricter check.</p>
        </>
      )}
    </div>
  );
};
