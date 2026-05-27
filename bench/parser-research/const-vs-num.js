// A/B: does naming the char-code literals (ASCII_QUOTE = '"'.charCodeAt(0), …)
// cost anything vs the bare numeric literals (cc === 34)?
//
//   num   = bench/parser-research/parser-num.js   (literal char codes: cc === 34)
//   const = src/core/parser.js                    (named ASCII_* constants)
//
// The two modules are byte-identical apart from that swap. A module-scope `const`
// bound to a Smi is folded by the optimizer, so the prediction is "flat within
// noise". This bench is the evidence, not the assertion.
//
//   npx nano-bench bench/parser-research/const-vs-num.js

import {jsonParser as jsonParserConst} from '../../src/core/parser.js';
import {jsonParser as jsonParserNum} from './parser-num.js';
import {none} from 'stream-chain/core';

// ~1 MB mixed dataset (same shape as parser-sync.js).
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

let sink = 0;

// One full sync parse: feed the whole buffer, flush, touch every token.
const run = factory => {
  const f = factory();
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

const tokenCount = factory => {
  const f = factory();
  let count = 0,
    r = f(jsonData);
  if (r !== none) count += r.values.length;
  r = f(none);
  if (r !== none) count += r.values.length;
  return count;
};

// Refuse to benchmark if the two parsers don't agree on token output.
const nNum = tokenCount(jsonParserNum),
  nConst = tokenCount(jsonParserConst);
if (nNum !== nConst) throw new Error(`token-count mismatch: num=${nNum} const=${nConst}`);
console.log(`[const-vs-num] ${bytes} bytes (${(bytes / 1e6).toFixed(3)} MB), ${items.length} objects | tokens=${nNum} (num === const)`);

export default {
  num(n) {
    for (let i = 0; i < n; ++i) run(jsonParserNum);
  },
  const(n) {
    for (let i = 0; i < n; ++i) run(jsonParserConst);
  }
};

export {sink};
