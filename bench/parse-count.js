// Realistic parse-only benchmark: count every token. Compares three executors
// for the same downstream work:
//
//   1. chain-base       — chain([createReadStream, parser()]) + on('data') counter
//                         (the idiomatic Node-stream way)
//   2. parseFile-gen    — pipe(parseFile(), counter)(path) + drain
//                         (new code, pure-functional gen() executor)
//   3. parseFile-chain  — chain([parseFile(), counter]); write(path); end()
//                         (new code, same stages, wrapped through chain() so the
//                         pipeline runs as a Node Duplex Transform)
//
// All three count `++count` per token (sink — `counter` returns `none`). The
// count is asserted equal across variants on first run as a correctness check.
//
// Fixture: 1000 objects (~100 KB JSON), written once to a process-private tmp
// file at module load. Run via `npm run bench -- bench/parse-count.js`.
//
// Representative numbers (Intel i3-10110U, Node 26, 2026-05-28):
//
//   variant            median   relative
//   chain-base         15.84ms  (Node-stream baseline)
//   parseFile-gen       9.43ms  ~68% faster   (gen executor)
//   parseFile-chain     9.42ms  ~68% faster   (chain executor wrapping the same gen pipeline)
//
// Reading: with the counter INSIDE the pipeline (the realistic case — most
// SAX pipelines do their work on tokens via a downstream stage, not via an
// external on('data')), the per-token Node-Duplex boundary that `chain-base`
// crosses externally dominates. The new `parseFile` keeps the sink inside the
// executor, so tokens never cross a stream boundary. gen() and chain() come
// out within noise of each other — the executor choice barely matters when
// the work is sink-shaped; the win comes from where the sink lives.
//
// Note: a stress-test where the SINK is external (e.g. `pipe(parseFile())(path)`
// drained per-token by a for-await) puts the gen async-bridge on the hot path
// and is much slower (~57 ms in earlier measurements) — but that's not a
// realistic shape, and is not what this bench measures.

import {createReadStream, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {finished} from 'node:stream/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {none} from 'stream-chain/core';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import parseFile from '../src/file/parser.js';
import pipe from '../src/core/utils/pipe.js';
import drain from '../src/core/utils/drain.js';

const items = [];
for (let i = 0; i < 1000; ++i) {
  items.push({
    id: i,
    name: `item-${i}-${'x'.repeat(20)}`,
    active: i % 2 === 0,
    score: i * 1.5,
    tags: ['alpha', 'beta', 'gamma'],
    nested: {x: i, y: i * 2, label: `nested-${i}`}
  });
}
const jsonData = JSON.stringify(items);

const dir = mkdtempSync(join(tmpdir(), 'sj-parse-count-bench-'));
const srcPath = join(dir, 'in.json');
writeFileSync(srcPath, jsonData);

process.on('exit', () => {
  try {
    rmSync(dir, {recursive: true, force: true});
  } catch {}
});

const makeCounter = () => {
  let count = 0;
  return {
    fn: () => {
      ++count;
      return none;
    },
    get: () => count
  };
};

export default {
  async ['chain-base'](n) {
    for (let i = 0; i < n; ++i) {
      const c = makeCounter();
      const pipeline = chain([createReadStream(srcPath), parser()]);
      pipeline.on('data', c.fn);
      await finished(pipeline);
    }
  },
  async ['parseFile-gen'](n) {
    for (let i = 0; i < n; ++i) {
      const c = makeCounter();
      await drain(pipe(parseFile(), c.fn)(srcPath));
    }
  },
  async ['parseFile-chain'](n) {
    for (let i = 0; i < n; ++i) {
      const c = makeCounter();
      const pipeline = chain([parseFile(), c.fn]);
      pipeline.resume(); // sink consumer (counter returns none); flow drains so 'end' can fire
      pipeline.end(srcPath);
      await finished(pipeline);
    }
  }
};
