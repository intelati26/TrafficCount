#!/usr/bin/env bash
# Fails if built traffic data (or anything large) is tracked by git. Built data stays local; see docs/STORAGE_DESIGN.md.
set -euo pipefail
bad=0
# 1) forbidden paths and extensions
while IFS= read -r f; do
  case "$f" in
    public/data/*|data/*|*.parquet|*.ndjson|*.duckdb|*.duckdb.wal|*.geojson|*.shp|*.gdb/*|*.zip) echo "DATA FILE TRACKED: $f"; bad=1 ;;
  esac
done < <(git ls-files)
# 2) anything over 5 MB
while IFS= read -r f; do
  [ -f "$f" ] || continue
  size=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f")
  if [ "$size" -gt 5242880 ]; then echo "LARGE FILE TRACKED (>5 MB): $f ($size bytes)"; bad=1; fi
done < <(git ls-files)
[ "$bad" = 0 ] && echo "ok: no data files or large files are tracked" || { echo "Remove these from git (and add them to .gitignore)."; exit 1; }
