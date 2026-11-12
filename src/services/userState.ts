// "Notes & settings" sync file: a small, mergeable JSON of YOUR data only (saved archives, notes, custom counts, settings, deletions).
// It never contains the built traffic data (Parquet) or the bundled sample tables. Merge is last-write-wins per record using updatedAt,
// and deletions travel as tombstones, so files can be passed between devices in any order without losing newer edits.
import { trafficDb } from './db';
import { SYNCED_STORES, SyncedStore, getDeviceId, getSettings, setSettings, getTombstones, setTombstones, clearTombstone, recordTombstone, Setting } from './tombstones';

export const USER_STATE_VERSION = 1;
type Rec = { id: string; updatedAt?: string; dateArchived?: string; createdAt?: string; [k: string]: any };
const stamp = (r: Rec) => r.updatedAt ?? r.dateArchived ?? r.createdAt ?? '';

export interface UserStateFile {
  app: 'traffic-archive'; kind: 'user-state'; version: number; deviceId: string; exportedAt: string;
  records: Record<SyncedStore, Rec[]>; settings: Record<string, Setting>; tombstones: Record<string, string>;
}
export interface MergeSummary { added: number; updated: number; deleted: number; unchanged: number; settings: number; skipped: number }

export async function exportUserState(): Promise<{ json: string; counts: Record<string, number> }> {
  const records = {} as Record<SyncedStore, Rec[]>;
  for (const s of SYNCED_STORES) records[s] = await trafficDb.getAll<Rec>(s);
  const file: UserStateFile = { app: 'traffic-archive', kind: 'user-state', version: USER_STATE_VERSION, deviceId: getDeviceId(), exportedAt: new Date().toISOString(), records, settings: getSettings(), tombstones: getTombstones() };
  return { json: JSON.stringify(file), counts: { archives: records.archives.length, custom_counts: records.custom_counts.length, settings: Object.keys(file.settings).length, deletions: Object.keys(file.tombstones).length } };
}

/** Merge an incoming file. With dryRun true nothing is written: returns what would change. */
export async function mergeUserState(text: string, dryRun = false): Promise<{ ok: boolean; message: string; summary?: MergeSummary }> {
  let f: UserStateFile;
  try { f = JSON.parse(text); } catch { return { ok: false, message: 'Not valid JSON.' }; }
  if (f?.kind !== 'user-state' || f.app !== 'traffic-archive') return { ok: false, message: 'This is not a notes & settings file (use the full-database import for old backups).' };
  if (f.version > USER_STATE_VERSION) return { ok: false, message: `File version ${f.version} is newer than this app understands (${USER_STATE_VERSION}). Update the app first.` };
  const sum: MergeSummary = { added: 0, updated: 0, deleted: 0, unchanged: 0, settings: 0, skipped: 0 };
  const tombs = { ...getTombstones() };
  const inTombs = f.tombstones ?? {};

  for (const store of SYNCED_STORES) {
    const local = new Map((await trafficDb.getAll<Rec>(store)).map(r => [r.id, r]));
    for (const inc of f.records?.[store] ?? []) {
      if (!inc?.id) { sum.skipped++; continue; }
      const key = `${store}:${inc.id}`, its = stamp(inc), tomb = tombs[key] ?? inTombs[key];
      if (tomb && tomb >= its) { sum.skipped++; continue; } // deleted after this version was written
      const cur = local.get(inc.id);
      if (!cur) { sum.added++; if (!dryRun) { await trafficDb.put(store, inc, { keepStamp: true }); clearTombstone(store, inc.id); } }
      else if (its > stamp(cur)) { sum.updated++; if (!dryRun) await trafficDb.put(store, inc, { keepStamp: true }); }
      else sum.unchanged++;
    }
    // deletions made on the other device
    for (const [key, at] of Object.entries(inTombs)) {
      if (!key.startsWith(store + ':')) continue;
      const id = key.slice(store.length + 1), cur = local.get(id);
      if (cur && at > stamp(cur)) { sum.deleted++; if (!dryRun) { await trafficDb.delete(store, id, { silent: true }); } }
      if (!dryRun && (!tombs[key] || tombs[key] < at)) tombs[key] = at;
    }
  }
  const st = getSettings();
  for (const [k, s] of Object.entries(f.settings ?? {})) if (!st[k] || st[k].updatedAt < s.updatedAt) { sum.settings++; st[k] = s; }
  if (!dryRun) { setSettings(st); setTombstones(tombs); }
  return { ok: true, message: dryRun ? 'Preview only, nothing changed.' : 'Merged.', summary: sum };
}
export { recordTombstone };
