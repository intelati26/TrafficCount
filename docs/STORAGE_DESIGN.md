# Storage layer sketch: Parquet + DuckDB-WASM (modelled on ../warroom)

Status: design only, nothing implemented. Replaces the uncompressed IndexedDB/localStorage JSON in `src/services/db.ts`
for the bulk data; IndexedDB stays for the user's own saved items (archives, notes, tags).

## Scope
- **In:** GIS segments (geometry + AADT by year) and linked statistics (truck %, K/D factors, classification, continuous-count stations).
- **Out of the database: PDFs.** Official PDF maps are *browse and save for off-app viewing*: the app lists them (metadata only), links to the
  agency's `officialUrl`, and offers a save-to-disk button. No PDF bytes go into IndexedDB or Parquet.

## No data in the repo
The repository holds code only. **The user builds the Parquet set locally** (`scripts/build-data.*`, run per state) into a git-ignored `data/` directory
(`.gitignore`: `data/`, `public/data/`); the app reads from there via vite's dev/preview server or any static host the user chooses.
No GIS, Parquet or PDF files are committed, which also sidesteps per-state redistribution licensing.

## Files (static, built locally by the user, zstd Parquet, one set per state)
```
public/data/q/
  manifest.json                 state list, years, row counts, file sizes, sha256, build date
  seg/<ST>/<year>.parquet       one row per segment-year: id, route, county, district, lanes, fclass, aadt, truck_aadt, k, d, from_mp, to_mp, geom (WKB, EPSG:4326), min/max lng/lat
  sta/<ST>.parquet              continuous-count stations + monthly/hourly/class profiles (long format)
  docs/<ST>.parquet             PDF/map catalogue: title, year, category, format, size_mb, sha256, officialUrl, coverage  (metadata only)
  hpms/<year>.parquet           national HPMS fallback layer, all 50 states
```
Partition by state+year so a page loads only what it views (warroom does one file per table; here state/year is the natural split).
Expected size: roughly 4–8x smaller than raw JSON, so the earlier ~63 GB raw estimate is plausibly ~10–15 GB compressed for all states; one state-year is a few MB.
Sort by route + milepost before writing so row-group stats make `WHERE route=...` cheap.

## Runtime
- DuckDB-WASM from jsDelivr (pinned), same as warroom; optional vendored copy for offline/PWA.
- A `src/services/queryDb.ts` loads DuckDB lazily, registers files by HTTP range reads, exposes `query(sql, params)`.
- Existing components (`GisMapViewer`, `TrendAnalyzer`, `DataGridTable`, corridor utils) switch from in-memory arrays to SQL results; `stateRegistry.ts` keeps only static config (borders, districts, cities).
- Spatial: bbox columns (min/max lng/lat) on every row for map viewport filtering; DuckDB `spatial` extension only if needed.
- Needs HTTP (vite dev/preview/static host); will not work from `file://`. The PWA service worker should precache `manifest.json` and cache Parquet on first use, not at install.

## PDFs: browse / save / open off-app
- `docs/<ST>.parquet` powers the existing Document Archive viewer (filter by state, year, category).
- Per row: **Open** (new tab to `officialUrl`), **Save** (anchor `download`, or File System Access `showSaveFilePicker` to stream into a user-chosen folder; the app never keeps the bytes), **Copy link**, and **Export list** (CSV of selected docs for a batch download script).
- Many agency hosts block cross-origin fetch (CORS), so Save falls back to opening the link; a small optional local helper (`scripts/fetch-docs.mjs`) can download a selection to disk and write a manifest with sha256 so integrity is still checkable.
- The `archivedLocally` flag becomes "saved to disk" with the filename and hash recorded in user-state IndexedDB, not file contents.

## Build pipeline (offline, per state)
1. Fetch the state's GIS layer(s) (ArcGIS REST `query?f=geojson` paged, or bulk download); fall back to HPMS.
2. Normalise to the `seg` schema (FHWA functional class, route naming, AADT year columns -> long format), with a per-state mapping file.
3. Write Parquet with DuckDB CLI or `pyarrow` (zstd), update `manifest.json` with counts and sha256.
4. Validate: row count vs source, AADT non-null rate, geometry bbox inside the state, no duplicate (id, year).

## Implemented (phase 1)
- `scripts/build-data.ts`: `--seed` converts the bundled sample data (pipeline test); `--state XX --geojson f --map m.json` builds a state from GeoJSON. Output is `public/data/q/` (git-ignored) plus `manifest.json`.
  Run with `deno run -A npm:tsx scripts/build-data.ts --seed` (or `npx tsx` / `bun`).
- v1 layout is **one wide file per state and kind** (`seg/<ST>.parquet` with `aadt_2018..aadt_2024` columns, `sta/`, `docs/`), matching the app's `TrafficSegment` shape. The segment-year long layout above is a later optimisation.
- `src/services/queryDb.ts`: lazy DuckDB-WASM (jsDelivr), `segments/stations/documents(state)`, bbox + low-res geometry, WKB decoder, raw `sql()`.
- `App.tsx` overlays Parquet data for the active state when a manifest exists, else keeps the bundled samples.
- Map loads by viewport: `GisMapViewer` reports the visible bbox + zoom (debounced); `App` queries Parquet with the bbox, low-res geometry when zoomed out, and only the main network (Interstate/Freeway, then principal and minor arterials) until zoomed in; capped at 8,000 segments, busiest first.
- The grid/analysis set loads the busiest 20,000 segments per state with low-res geometry; the grid puts only 250 rows in the DOM at a time (Show 500 more / Show all). True server-side SQL paging/sorting is still to do.
- `build-data.ts --out DIR` writes elsewhere; the GeoJSON path was verified with a synthetic file (LineString + MultiLineString, WKB sizes correct).
- Documents list has a CSV export (titles, years, official URLs).
- PDFs: list rows and the viewer header have **Open** (new tab) and **Save to disk** (save picker, falling back to opening the link when the host blocks CORS). The old "archive PDF into the DB" buttons were removed.
- Not yet: GeoParquet `geo` metadata, long-format years, real state mapping files, server-side SQL paging for the grid.

## Phases
1. Prove it on MO + HPMS: build script, Parquet, `queryDb.ts`, swap `GisMapViewer` and the grid.
2. Document catalogue as Parquet + Open/Save UI.
3. Tier A states (22), then B; per-state mapping files.
4. Replace the JSON export with Parquet/CSV export of query results; drop the 2-space pretty print.

## Open questions
- Hosting: decided, user builds locally; repo holds no data.
- Geometry: decided, see below.
- Whether to keep a localStorage fallback at all once data is read-only static files.

## Geometry encoding (decision)
- **Canonical column `geom`: WKB LineString/MultiLineString in EPSG:4326** (GeoParquet-compatible). The user's build tools (DuckDB `spatial`, `ogr2ogr`, GeoPandas) write it natively, and QGIS/GDAL/DuckDB can open the files outside the app.
- **Decode in JS**, not with DuckDB's `spatial` extension: a LineString WKB parser is ~30 lines, avoids the extra WASM extension download, and the map needs coordinate arrays anyway.
- **Filter with bbox columns** (`min_lng, max_lng, min_lat, max_lat`), plain DOUBLE columns, so viewport queries use Parquet row-group stats with no geometry decoding.
- **Optional `geom_lo`**: the same line simplified (Douglas-Peucker, ~100 m) for statewide/zoomed-out views; the app picks it by zoom and loads `geom` only when zoomed in.
- Rejected: nested lng/lat arrays (not portable, not GeoParquet) and quantized delta ints (smaller, but custom decode and lossy; revisit only if size or render time is a problem).
- Cost: WKB is 16 bytes/vertex before zstd; segments are short, so this is acceptable.

## Geometry encoding: UPDATED (supersedes the WKB decision above)
- `geom` / `geom_lo` are now **delta + zigzag varint blobs at 1e-7 degrees (~1 cm grid)**, magic byte `0xD7`, then precision exponent, line count, and per line the vertex count and coordinate deltas. Codec: `scripts/geomcodec.ts` (encode, decode, WKB export/import); browser decoder: `decodeGeom` in `src/services/queryDb.ts`, which also still reads plain WKB from older files.
- Why: HPMS/state centerlines are accurate to metres, so a 1 cm step loses nothing real; geometry alone shrinks about 3-4x, whole files 1.4x to 2.5x (Arkansas 105 -> 42 MB, Missouri 20 -> 14 MB, Oklahoma 66 -> 46 MB).
- Verified: 20,000 random Arkansas rows x2 geometries round-trip with identical structure and max error 0.56 cm.
- Existing files can be migrated without refetching: `deno run -A npm:tsx scripts/recompress.ts public/data/q/seg/XX.parquet ...` (row-count checked).
- No longer GeoParquet: outside tools need geometry exported to WKB/GeoJSON first (`toWKB` in the codec).
