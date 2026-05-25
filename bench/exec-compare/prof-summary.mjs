#!/usr/bin/env node
// Summarize a V8 .cpuprofile: aggregate self-time by function and print the
// hottest. Self-time of a sampled node = sum of the timeDeltas attributed to
// it; we collapse nodes by functionName+url:line so the same function isn't
// split across call sites.
//
//   node prof-summary.mjs prof/new.cpuprofile [topN]

import {readFileSync} from 'node:fs';

const [, , file, topArg] = process.argv;
const top = Number(topArg) || 25;
const prof = JSON.parse(readFileSync(file, 'utf8'));

const nodeById = new Map();
for (const n of prof.nodes) nodeById.set(n.id, n);

// self microseconds per node id
const selfById = new Map();
const {samples, timeDeltas} = prof;
for (let i = 0; i < samples.length; ++i) {
  const id = samples[i];
  selfById.set(id, (selfById.get(id) || 0) + (timeDeltas[i] || 0));
}

const label = cf => {
  const name = cf.functionName || '(anonymous)';
  const url = (cf.url || '').replace(/.*\/(node_modules\/)?/, '$1').replace(/^node:/, 'node:');
  return url ? `${name}  ${url}:${cf.lineNumber + 1}` : name;
};

const byFn = new Map();
let totalUs = 0;
for (const [id, us] of selfById) {
  totalUs += us;
  const node = nodeById.get(id);
  if (!node) continue;
  const key = label(node.callFrame);
  byFn.set(key, (byFn.get(key) || 0) + us);
}

const rows = [...byFn.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
console.log(`# ${file}`);
console.log(`# total sampled self-time: ${(totalUs / 1000).toFixed(1)} ms across ${samples.length} samples\n`);
console.log('   self-ms    %    function');
for (const [name, us] of rows) {
  console.log(`${(us / 1000).toFixed(2).padStart(9)}  ${((100 * us) / totalUs).toFixed(1).padStart(5)}%  ${name}`);
}
