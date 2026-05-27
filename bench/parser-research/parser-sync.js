// Sync token-production micro-benchmark for the core JSON parser.
//
// Drives the bare `jsonParser()` flushable directly — buffer in, `many()` out,
// consumed synchronously — with ZERO stream-chain drain (no chain, no Readable,
// no .on('data')). This isolates the parser's raw scanning + token-allocation
// rate. This is the number parser-internal optimizations actually move, and the
// regression baseline for the optimization work.
//
// Run: npx nano-bench bench/parser-research/parser-sync.js
// MB/s = (dataset bytes / 1e6) / per-op-seconds   (per-op = one full parse)

import {jsonParser} from '../../src/core/parser.js';
import {none} from 'stream-chain/core';

// ~1 MB mixed dataset: strings, ints, floats, bools, arrays, nested objects.
const items = [];
for (let i = 0; i < 5000; ++i) {
  items.push({
    id: i,
    name: `item-${i}-${'x'.repeat(20)}`,
    active: i % 2 === 0,
    score: i * 1.5,
    ratio: i / 7,
    tags: ['alpha', 'beta', 'gamma'],
    nested: {x: i, y: i * 2, label: `nested-${i}`, deep: {a: i, b: i % 3 === 0}}
  });
}
const jsonData = JSON.stringify(items);
const bytes = Buffer.byteLength(jsonData);

const OPT_PACK = {packValues: true, streamValues: false};
const OPT_STREAM = {packValues: false, streamValues: true};

const tokenCount = options => {
  const f = jsonParser(options);
  let count = 0,
    r = f(jsonData);
  if (r !== none) count += r.values.length;
  r = f(none);
  if (r !== none) count += r.values.length;
  return count;
};
console.log(
  `[parser-sync] ${bytes} bytes (${(bytes / 1e6).toFixed(3)} MB), ${items.length} objects | ` +
    `tokens: default=${tokenCount()} pack-only=${tokenCount(OPT_PACK)} stream-only=${tokenCount(OPT_STREAM)}`
);

let sink = 0;

// One full sync parse: feed the whole buffer, flush, touch every token.
const run = options => {
  const f = jsonParser(options);
  let r = f(jsonData);
  if (r !== none) {
    const v = r.values;
    for (let i = 0; i < v.length; ++i) sink += v[i].name.length;
  }
  r = f(none);
  if (r !== none) {
    const v = r.values;
    for (let i = 0; i < v.length; ++i) sink += v[i].name.length;
  }
};

export default {
  default(n) {
    for (let i = 0; i < n; ++i) run();
  },
  ['pack-only'](n) {
    for (let i = 0; i < n; ++i) run(OPT_PACK);
  },
  ['stream-only'](n) {
    for (let i = 0; i < n; ++i) run(OPT_STREAM);
  }
};

export {sink};
