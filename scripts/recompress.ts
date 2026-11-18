// Rewrites existing seg/*.parquet geometry from plain WKB to delta-varint (1e-7 deg) without refetching anything.
//   deno run -A npm:tsx scripts/recompress.ts public/data/q/seg/MO.parquet [more files...]
import { DuckDBInstance } from '@duckdb/node-api';
import { writeFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { encodeGeom, fromWKB, GEOM_MAGIC } from './geomcodec';

for (const file of process.argv.slice(2)) {
  const before = statSync(file).size;
  const con = await (await DuckDBInstance.create(':memory:')).connect();
  const rows = (await con.runAndReadAll(`SELECT id, hex(geom) AS g, hex(geom_lo) AS l FROM '${file}'`)).getRowObjectsJson() as any[];
  if (!rows.length) continue;
  if (Buffer.from(rows[0].g.slice(0, 2), 'hex')[0] === GEOM_MAGIC) { console.log(`${file}: already delta-varint`); continue; }
  const conv = (h: string) => encodeGeom(fromWKB(Buffer.from(h, 'hex'))).toString('hex');
  const tmpJson = file + '.geom.ndjson', tmpGeom = file + '.geom.parquet', out = file + '.new';
  writeFileSync(tmpJson, rows.map(r => JSON.stringify({ id: r.id, geom: conv(r.g), geom_lo: conv(r.l) })).join('\n'));
  await con.run(`COPY (SELECT id::VARCHAR AS id, unhex(geom) AS geom, unhex(geom_lo) AS geom_lo FROM read_json_auto('${tmpJson}', format='newline_delimited', columns={id:'VARCHAR', geom:'VARCHAR', geom_lo:'VARCHAR'})) TO '${tmpGeom}' (FORMAT parquet, COMPRESSION zstd)`);
  await con.run(`COPY (SELECT o.* REPLACE (n.geom AS geom, n.geom_lo AS geom_lo) FROM '${file}' o JOIN '${tmpGeom}' n ON o.id::VARCHAR = n.id ORDER BY o.route, o.mp_start) TO '${out}' (FORMAT parquet, COMPRESSION zstd)`);
  const n = (await con.runAndReadAll(`SELECT count(*)::INT n FROM read_parquet('${out}')`)).getRowObjectsJson()[0].n;
  if (n !== rows.length) throw new Error(`row count changed: ${rows.length} -> ${n}`);
  rmSync(tmpJson); rmSync(tmpGeom); renameSync(out, file);
  console.log(`${file}: ${rows.length} rows, ${(before / 1e6).toFixed(1)} MB -> ${(statSync(file).size / 1e6).toFixed(1)} MB`);
}
