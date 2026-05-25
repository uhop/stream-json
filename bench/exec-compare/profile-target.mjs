#!/usr/bin/env node
// Single-shot profiling target: run one workflow N times off disk, then exit.
// Drive it under the V8 sampling profiler and analyze with prof-summary.mjs:
//
//   node --cpu-prof --cpu-prof-dir=prof --cpu-prof-name=new.cpuprofile \
//        profile-target.mjs transform 200
//
// First arg = substring of a file-pipelines workflow key; second = iterations.

import workflows from './file-pipelines.js';

const want = (process.argv[2] || 'transform').toLowerCase();
const iters = Number(process.argv[3]) || 200;

const key = Object.keys(workflows).find(k => k.toLowerCase().includes(want));
if (!key) {
  console.error(`no workflow matching "${want}". keys: ${Object.keys(workflows).join(' | ')}`);
  process.exit(1);
}

const t0 = performance.now();
await workflows[key](iters);
console.error(`profiled "${key}" ×${iters} in ${(performance.now() - t0).toFixed(0)} ms`);
