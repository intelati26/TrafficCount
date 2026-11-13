// Compact line geometry: delta + zigzag varint at a fixed decimal precision (default 1e-7 deg, ~1 cm). See docs/STORAGE_DESIGN.md.
// Blob layout:  0xD7 (magic; WKB starts with 0x00/0x01 so the two are distinguishable)  |  precision exponent (7)  |
//               varint nLines  |  per line: varint nPts, then nPts x (zigzag varint dLng, zigzag varint dLat) in quantized units,
//               deltas running across the whole blob starting at (0,0).
// The browser decoder lives in src/services/queryDb.ts (decodeGeom) and must stay in step with this file.
type LngLat = [number, number];
export const GEOM_MAGIC = 0xd7;

export function encodeGeom(lines: LngLat[][], exp = 7): Buffer {
  const k = 10 ** exp, out: number[] = [GEOM_MAGIC, exp];
  const put = (n: number) => { let z = n >= 0 ? n * 2 : -n * 2 - 1; while (z >= 128) { out.push((z % 128) | 128); z = Math.floor(z / 128); } out.push(z); };
  const putU = (n: number) => { while (n >= 128) { out.push((n % 128) | 128); n = Math.floor(n / 128); } out.push(n); };
  putU(lines.length);
  let px = 0, py = 0;
  for (const l of lines) {
    putU(l.length);
    for (const [x, y] of l) { const qx = Math.round(x * k), qy = Math.round(y * k); put(qx - px); put(qy - py); px = qx; py = qy; }
  }
  return Buffer.from(out);
}

export function decodeGeom(b: Uint8Array): LngLat[][] {
  if (b[0] !== GEOM_MAGIC) throw new Error('not a delta-varint geometry');
  const k = 10 ** b[1]; let o = 2;
  const getU = () => { let r = 0, m = 1, c: number; do { c = b[o++]; r += (c & 127) * m; m *= 128; } while (c & 128); return r; };
  const get = () => { const z = getU(); return z % 2 === 0 ? z / 2 : -(z + 1) / 2; };
  const lines: LngLat[][] = []; let x = 0, y = 0;
  for (let n = getU(); n > 0; n--) {
    const pts: LngLat[] = [];
    for (let m = getU(); m > 0; m--) { x += get(); y += get(); pts.push([x / k, y / k]); }
    lines.push(pts);
  }
  return lines;
}

// Standard WKB (little endian LineString / MultiLineString) for export and for reading older files.
export function toWKB(lines: LngLat[][]): Buffer {
  const parts = lines.map(pts => {
    const b = Buffer.alloc(9 + pts.length * 16);
    b.writeUInt8(1, 0); b.writeUInt32LE(2, 1); b.writeUInt32LE(pts.length, 5);
    pts.forEach(([x, y], i) => { b.writeDoubleLE(x, 9 + i * 16); b.writeDoubleLE(y, 17 + i * 16); });
    return b;
  });
  if (parts.length === 1) return parts[0];
  const head = Buffer.alloc(9); head.writeUInt8(1, 0); head.writeUInt32LE(5, 1); head.writeUInt32LE(parts.length, 5);
  return Buffer.concat([head, ...parts]);
}

export function fromWKB(b: Uint8Array): LngLat[][] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const line = (o: number) => { const n = dv.getUint32(o + 5, true); const pts: LngLat[] = []; for (let i = 0; i < n; i++) pts.push([dv.getFloat64(o + 9 + i * 16, true), dv.getFloat64(o + 17 + i * 16, true)]); return { pts, end: o + 9 + n * 16 }; };
  if (dv.getUint32(1, true) === 2) return [line(0).pts];
  const n = dv.getUint32(5, true), out: LngLat[][] = []; let o = 9;
  for (let i = 0; i < n; i++) { const r = line(o); out.push(r.pts); o = r.end; }
  return out;
}
