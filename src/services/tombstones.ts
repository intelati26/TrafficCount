// Tiny localStorage helpers shared by db.ts and userState.ts (kept separate to avoid an import cycle).
// Deleted records leave a tombstone so a later merge from another device does not bring them back.
const KEY = 'tm_tombstones', DEVICE = 'tm_device_id', SETTINGS = 'tm_settings';
const rd = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const wr = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable: sync data is best-effort */ } };

export const SYNCED_STORES = ['archives', 'custom_counts'] as const;
export type SyncedStore = (typeof SYNCED_STORES)[number];

export const getTombstones = (): Record<string, string> => rd(KEY, {});
export const setTombstones = (t: Record<string, string>) => wr(KEY, t);
export const recordTombstone = (store: string, id: string, at = new Date().toISOString()) => {
  if (!(SYNCED_STORES as readonly string[]).includes(store)) return;
  const t = getTombstones(); t[`${store}:${id}`] = at; setTombstones(t);
};
export const clearTombstone = (store: string, id: string) => { const t = getTombstones(); if (delete t[`${store}:${id}`]) setTombstones(t); };

export const getDeviceId = (): string => {
  let id = rd<string>(DEVICE, '');
  if (!id) { id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).slice(0, 8); wr(DEVICE, id); }
  return id;
};

export interface Setting { value: unknown; updatedAt: string }
export const getSettings = (): Record<string, Setting> => rd(SETTINGS, {});
export const setSettings = (s: Record<string, Setting>) => wr(SETTINGS, s);
export const setSetting = (key: string, value: unknown) => { const s = getSettings(); s[key] = { value, updatedAt: new Date().toISOString() }; setSettings(s); };
export const getSetting = <T,>(key: string, fallback: T): T => (getSettings()[key]?.value as T) ?? fallback;
