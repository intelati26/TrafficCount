# Moving your notes and settings between devices

Scope: only YOUR data (saved archives and their notes, custom counts, settings, deletions). Transfer of the large built data (Parquet) is deliberately on hold.

**File:** `traffic-archive-notes-settings_<date>.json`, a few hundred bytes per record. Written by DatabaseManager > "Export Notes & Settings"; read by "Merge Notes & Settings".
Shape: `{ app, kind: "user-state", version: 1, deviceId, exportedAt, records: { archives[], custom_counts[] }, settings: { key: { value, updatedAt } }, tombstones: { "store:id": isoTime } }`.

**Merge rules** (`src/services/userState.ts`):
- Per record, the newest `updatedAt` wins (falls back to `dateArchived` / `createdAt`). A newer local edit is never overwritten.
- Deleting a record writes a tombstone; a tombstone newer than a record's timestamp deletes it, and blocks older copies from coming back.
- Settings are last-write-wins per key. Files with a newer `version`, or that are not user-state files, are rejected.
- The UI previews counts (add / update / delete / unchanged) and asks before writing. Files can be merged in any order, any number of times.

**Stamps:** `db.put` stamps `updatedAt` on archives and custom counts; `db.delete` records the tombstone (both in localStorage helpers, `src/services/tombstones.ts`).

**Verified in the browser:** dry run changes nothing; add, update, ignore-older, delete, tombstone-blocks-resurrection, settings merge, bad and too-new files.

**Not covered yet:** traveled-segment marks (they will use `seg_key` and join this same file once that feature exists); two devices editing the same record at the same millisecond (the later file merged wins); old full-database backups still use the separate import button.
