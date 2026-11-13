// Browser-safe twin of scripts/geomcodec.ts (no Node Buffer): delta + zigzag varint lines at 1e-7 degrees. The two must produce identical bytes.
export type LngLat = [number, number];
export const GEOM_MAGIC = 0xd7;

export function encodeGeom(lines: LngLat[][], exp = 7): Uint8Array {
  const k = 10 ** exp, out: number[] = [GEOM_MAGIC, exp];
  const put = (n: number) => { let z = n >= 0 ? n * 2 : -n * 2 - 1; while (z >= 128) { out.push((z % 128) | 128); z = Math.floor(z / 128); } out.push(z); };
  const putU = (n: number) => { while (n >= 128) { out.push((n % 128) | 128); n = Math.floor(n / 128); } out.push(n); };
  putU(lines.length);
  let px = 0, py = 0;
  for (const l of lines) {
    putU(l.length);
    for (const [x, y] of l) { const qx = Math.round(x * k), qy = Math.round(y * k); put(qx - px); put(qy - py); px = qx; py = qy; }
  }
  return Uint8Array.from(out);
}

export const toHex = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0'); return s; };

// Douglas-Peucker; tolerance in degrees (~100 m = 0.0009)
export function simplify(pts: LngLat[], tol: number): LngLat[] {
  if (pts.length <= 2) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}
