// Sequential full build in spiral order, one state at a time (memory-safe), continuing past failures.
// Skips states already built from a real source; large states (>700k sections) go last. Log: one "=== ST ok|FAIL" line per state.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const order = readFileSync('scoping/SPIRAL.md', 'utf8').split('\n').filter(l => /^\| \d+ \|/.test(l)).map(l => l.split('|')[3].trim());
const manifest = existsSync('public/data/q/manifest.json') ? JSON.parse(readFileSync('public/data/q/manifest.json', 'utf8')) : { files: [] };
const real = new Set(manifest.files.filter(f => f.kind === 'seg' && f.source).map(f => f.state));
const big = ['FL', 'TX', 'WI', 'CA', 'PA', 'NY'];
const todo = order.filter(s => !real.has(s) && !big.includes(s) && s !== 'MS');
const jobs = [...todo.map(s => ({ s, args: ['--hpms', s] })), ...(real.has('MS') ? [] : [{ s: 'MS', args: ['--mississippi'] }]), ...big.filter(s => !real.has(s)).map(s => ({ s, args: ['--hpms', s] }))];
console.log(`plan: ${jobs.map(j => j.s).join(' ')}`);
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const runOne = (j, tag = '') => {
  const t0 = Date.now();
  const r = spawnSync('deno', ['run', '-A', 'npm:tsx', 'scripts/build-data.ts', ...j.args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const secs = Math.round((Date.now() - t0) / 1000), out = (r.stdout ?? '') + (r.stderr ?? '');
  const kept = /(\d+) segments kept|(\d+) sections/.exec(out);
  console.log(`=== ${j.s} ${r.status === 0 ? 'ok' : 'FAIL'}${tag} ${secs}s ${kept ? (kept[1] ?? kept[2]) + ' sections' : ''} ${r.status === 0 ? '' : (out.split('\n').filter(l => /rror/.test(l)).pop() ?? '').trim()}`.trim());
  return r.status === 0;
};
let failed = [];
for (const j of jobs) if (!runOne(j)) failed.push(j);
// a failed state (usually the FHWA server being busy) is retried up to twice after a pause
for (let pass = 1; pass <= 2 && failed.length; pass++) {
  console.log(`--- retry pass ${pass}: ${failed.map(j => j.s).join(' ')} (waiting 90s)`); sleep(90000);
  failed = failed.filter(j => !runOne(j, ` (retry ${pass})`));
}
console.log(failed.length ? `=== STILL FAILING: ${failed.map(j => j.s).join(' ')}` : '=== every state built');
console.log('=== ALL DONE');
