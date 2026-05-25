// Isolate the one variable that flips the executor verdict: input CHUNK SIZE.
//
// Same in-memory document, same parse→stringify pipeline, fed through a
// Readable that emits it in fixed-size slices. "whole" = one giant chunk (what
// Readable.from([str]) does — the synthetic pipelines.js case). 64k = what
// fs.createReadStream / a socket delivers. Run under old vs new (./run.sh-style
// link dance) and compare how the gap moves with chunk size.

import {Readable} from 'node:stream';
import {existsSync} from 'node:fs';

import chain from 'stream-chain';
import parser from '../../src/parser.js';
import stringer from '../../src/stringer.js';

const scHasExec = existsSync(new URL('../exec.js', import.meta.resolve('stream-chain')));
process.stderr.write(`[chunk-sweep] executor: ${scHasExec ? 'unified exec() (new)' : 'async applyFns (baseline)'}\n`);

const COUNT = Number(process.env.BENCH_COUNT) || 2000;
const items = Array.from({length: COUNT}, (_, i) => ({
  id: i,
  name: `item-${i}-${'x'.repeat(20)}`,
  active: i % 2 === 0,
  score: i * 1.5,
  tags: ['alpha', 'beta', 'gamma'],
  nested: {x: i, y: i * 2, label: `nested-${i}`}
}));
const json = JSON.stringify(items);

const chunked = size => {
  if (size >= json.length) return [json];
  const parts = [];
  for (let i = 0; i < json.length; i += size) parts.push(json.slice(i, i + size));
  return parts;
};

const drain = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

const make = size => async n => {
  const parts = chunked(size);
  for (let i = 0; i < n; ++i) {
    await drain(chain([Readable.from(parts), parser(), stringer()]));
  }
};

export default {
  'whole (1 chunk)': make(Infinity),
  '256k chunks': make(256 * 1024),
  '64k chunks': make(64 * 1024),
  '16k chunks': make(16 * 1024),
  '4k chunks': make(4 * 1024)
};
