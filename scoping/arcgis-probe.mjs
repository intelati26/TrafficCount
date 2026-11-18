// Probes ArcGIS REST service/layer URLs for traffic data: layers, geometry, record counts, AADT-like fields.
// Usage: node scoping/arcgis-probe.mjs <url> [<url> ...]      (or: --file urls.txt)
import { readFileSync } from 'node:fs';
const J = async (u) => { const r = await fetch(u, { signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'traffic-archive-scoping/0.1' } }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); if (j.error) throw new Error(j.error.message || 'service error'); return j; };
const hit = /aadt|adt|vol|count|year|yr/i;

export async function probeLayer(base) {
  const meta = await J(`${base}?f=json`);
  let count = null;
  try { count = (await J(`${base}/query?where=1%3D1&returnCountOnly=true&f=json`)).count; } catch {}
  return {
    url: base, name: meta.name, geometry: meta.geometryType, maxRecordCount: meta.maxRecordCount ?? null, count,
    fields: (meta.fields || []).map(f => f.name), aadtFields: (meta.fields || []).filter(f => hit.test(f.name) || hit.test(f.alias || '')).map(f => f.name),
    srid: meta.extent?.spatialReference?.latestWkid ?? meta.extent?.spatialReference?.wkid ?? null,
  };
}

export async function probe(url) {
  url = url.replace(/\/+$/, '').replace(/\?.*$/, '');
  try {
    if (/\/\d+$/.test(url)) return [await probeLayer(url)];
    const svc = await J(`${url}?f=json`);
    const layers = (svc.layers || []).slice(0, 14);
    const out = [];
    for (const l of layers) { try { out.push(await probeLayer(`${url}/${l.id}`)); } catch (e) { out.push({ url: `${url}/${l.id}`, name: l.name, error: String(e.message) }); } }
    return out.length ? out : [{ url, error: 'no layers listed' }];
  } catch (e) { return [{ url, error: String(e.cause?.code || e.message) }]; }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const urls = args[0] === '--file' ? readFileSync(args[1], 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')) : args;
  const res = (await Promise.all(urls.map(probe))).flat();
  for (const r of res) console.log(r.error ? `✗ ${r.url}\n    ${r.error}` : `✓ ${r.url}\n    ${r.name} | ${r.geometry} | n=${r.count} | max=${r.maxRecordCount} | srid=${r.srid}\n    aadt-like: ${r.aadtFields.join(', ')}`);
}
