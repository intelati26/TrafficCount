// Data kept ON THIS DEVICE (the browser's private file storage, OPFS), for installs that ship without data: the Android app built by GitHub,
// or any browser. Files come from a Data Pack saved on another device (see Data Packs) and are read in place by DuckDB, never loaded whole.
import type { ManifestFile } from './queryDb';

const ROOT = 'traffic-data';
const MANIFEST = 'manifest.json';
const NAME = /^(?:(seg|hist|attr|sta|docs)[_/])?([A-Z]{2})\.parquet$/i; // seg_AR.parquet (Data Packs fallback) or AR.parquet inside a seg/ folder

export const localSupported = () => typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;

async function dir(create = false): Promise<FileSystemDirectoryHandle> {
  return (await navigator.storage.getDirectory()).getDirectoryHandle(ROOT, { create });
}

export async function readLocalManifest(): Promise<{ built: string; files: ManifestFile[] } | null> {
  if (!localSupported()) return null;
  try {
    const f = await (await (await dir()).getFileHandle(MANIFEST)).getFile();
    const m = JSON.parse(await f.text());
    return { built: m.built ?? '', files: (m.files ?? []).map((x: ManifestFile) => ({ ...x, local: true })) };
  } catch { return null; }
}

async function writeLocalManifest(files: ManifestFile[]) {
  const w = await (await (await dir(true)).getFileHandle(MANIFEST, { create: true })).createWritable();
  await w.write(JSON.stringify({ built: new Date().toISOString(), files: files.map(({ local, ...f }) => f) }, null, 1));
  await w.close();
}

export async function getLocalFile(path: string): Promise<FileSystemFileHandle> {
  let d = await dir();
  const parts = path.split('/');
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
  return d.getFileHandle(parts.at(-1)!);
}

export interface ImportResult { imported: string[]; skipped: string[] }

/**
 * Store chosen files. Accepts Parquet files named like seg_AR.parquet / hist_AR.parquet / attr_AR.parquet / sta_AR.parquet / docs_AR.parquet
 * (what Data Packs saves without a folder picker) and, optionally, the manifest.json saved with them (adds rows, years and source).
 */
export async function importFiles(files: File[], onProgress?: (done: number, total: number, name: string) => void): Promise<ImportResult> {
  if (!localSupported()) throw new Error('This browser cannot keep files on the device (no private file storage).');
  const res: ImportResult = { imported: [], skipped: [] };
  const mf = files.find((f) => f.name.toLowerCase() === 'manifest.json');
  const meta = new Map<string, ManifestFile>();
  if (mf) { try { for (const e of JSON.parse(await mf.text()).files ?? []) meta.set(e.file, e); } catch { /* manifest is optional */ } }
  const data = files.filter((f) => f !== mf);
  const current = (await readLocalManifest())?.files ?? [];
  const total = data.reduce((a, f) => a + f.size, 0); let done = 0;
  for (const f of data) {
    const m = NAME.exec(f.name);
    if (!m) { res.skipped.push(f.name); continue; }
    const kind = (m[1] ?? 'seg').toLowerCase() as ManifestFile['kind'], state = m[2].toUpperCase(), path = `${kind}/${state}.parquet`;
    let d = await dir(true); d = await d.getDirectoryHandle(kind, { create: true });
    const w = await (await d.getFileHandle(`${state}.parquet`, { create: true })).createWritable();
    onProgress?.(done, total, f.name);
    await f.stream().pipeTo(w); // streams straight into storage: a 100 MB file never sits in memory
    done += f.size; onProgress?.(done, total, f.name);
    const info = meta.get(path);
    const entry: ManifestFile = { state, kind, file: path, rows: info?.rows ?? 0, bytes: f.size, years: info?.years, latest: info?.latest, source: info?.source ?? (kind === 'seg' ? 'imported from this device' : undefined), local: true };
    const i = current.findIndex((x) => x.state === state && x.kind === kind);
    if (i >= 0) current[i] = entry; else current.push(entry);
    res.imported.push(`${kind} ${state}`);
  }
  await writeLocalManifest(current);
  return res;
}

export async function removeLocalState(state: string): Promise<void> {
  const files = (await readLocalManifest())?.files ?? [];
  for (const f of files.filter((x) => x.state === state)) {
    try { const parts = f.file.split('/'); let d = await dir(); for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p); await d.removeEntry(parts.at(-1)!); } catch { /* already gone */ }
  }
  await writeLocalManifest(files.filter((x) => x.state !== state));
}
