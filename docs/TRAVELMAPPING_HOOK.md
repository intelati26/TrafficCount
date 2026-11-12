# Future feature: see and mark traveled segments (TravelMapping hook)

Goal: overlay "segments I have traveled" on the AADT map, and let the user mark segments visually. Data sources of traveled routes: the TravelMapping project (https://github.com/TravelMapping/HighwayData) and its users' `.list` files.

## What is and is not verified
- The HighwayData **wiki** (Home, Who-manages-which-region, Fork & Pull) was read: it gives only the folder layout `hwy_data/<REGION>/<system>/<region>.<route>.wpt` (example `hwy_data/MA/usai/ma.i091.wpt`), `systems.csv` (last field "Level"), and says `.wpt` files hold shaping points. **It does not document line formats, label rules or the segment definition.**
- From general knowledge (NOT verified here, confirm against a real clone before building):
  a `.wpt` line is a waypoint label (optional alternate labels) followed by an OpenStreetMap URL carrying `lat=` and `lon=`;
  a user `.list` line names a region, a route, and two waypoint labels, meaning "traveled the route between these waypoints".
  A traveled segment is therefore a pair of consecutive waypoints on one route. Confirm coordinate order and the label/alt-label rules from a sample file.

## Why the data layer is already ready
- Every segment's full-resolution geometry is stored (`geom`, WKB, EPSG:4326), including segments that never had a count, plus `geom_lo` and bbox columns for fast spatial filtering.
- Segments carry route, direction/layer, milepoints and per-year AADT, so a marked segment can show its traffic history.

## Design
1. **Import**: a local script (like `scripts/build-data.ts`, user-run, nothing committed) reads a TravelMapping `hwy_data` clone and the user's `.list`; for each traveled pair it emits a polyline (the `.wpt` waypoints between the two labels). Output: `public/data/q/travel/<user>.parquet` (route, region, label1, label2, geom WKB). Also support a plain GeoJSON import and GPX tracks.
2. **Match to AADT segments** (spatial, no shared ids exist): for each traveled polyline, query segments whose bbox intersects it, keep those whose geometry lies within ~25 m of the polyline for most of its length and whose route name/number agrees where available. Store the result as pairs `(travel_id, seg_key, overlap_fraction)`.
3. **Stable keys**: the match must survive rebuilds, so segments now carry `seg_key` (state + layer + route + rounded endpoints). Missouri was built before this column existed and needs a rebuild (about 15 minutes) before matches are stored against it; ids like `MO-3-12345` are row counters and are NOT stable.
4. **User marks**: manual marking on the map (click or box-select, then toggle traveled) is stored in IndexedDB user state as `seg_key` + date + note, separate from the read-only Parquet data. Export/import as JSON and as a TravelMapping-style `.list` for round-tripping.
5. **Rendering**: a "Traveled" layer in `GisMapViewer`: traveled segments drawn with a distinct stroke over the bandwidth map, partial overlaps shown hatched. Stats panel: miles traveled per state/route/class and AADT-weighted exposure ("busiest road I have driven").
6. **Scale**: matching runs per state tile through DuckDB-WASM on the bbox columns; only the visible viewport's traveled polylines are tested, so it stays interactive.

## Open questions
- Direction: Missouri's data is directional (N/S/E/W layers) while a traveled route is not; likely mark both directions, or the one matching the travel order if the user's data has it.
- Licensing and redistribution of TravelMapping data: keep it user-supplied and local, like the AADT Parquet files.
- Whether to read `.wpt` files directly from the user's clone path (File System Access API) or via the import script.
