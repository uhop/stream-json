// Benchmark for the file-edge components (`parseFile` / `verifyFile` /
// `stringerToFile`) against the idiomatic Node-stream chain.
//
// Variants:
//   1. chain-base       — chain([createReadStream, parser()]) + on('data')
//   2. chain-await      — chain([createReadStream, parser()]) + for-await
//   3. parseFile        — pipe(parseFile()) + drain                 (new path)
//   4. roundtrip-base   — chain([createReadStream, parser(), stringer()]).pipe(createWriteStream)
//   5. roundtrip-new    — pipe(parseFile(), stringerToFile()) + drain (new path)
//   6. verify-base      — chain([createReadStream, verifier.asStream()])
//   7. verify-new       — verifyFile(path)                            (new path)
//
// Fixture: 1000 objects (~100 KB JSON), written once to a process-private tmp
// file at module load. Run via `npm run bench -- bench/file-roundtrip.js`.
//
// Representative numbers (Intel i3-10110U, Node 26, 2026-05-28):
//
//   variant         median   relative
//   chain-base       15.6ms   (baseline parse-only)
//   chain-await      40.6ms
//   parseFile        57.5ms   parse-only:    SLOWER than chain-base
//   roundtrip-base   49.7ms   (baseline round-trip)
//   roundtrip-new    30.4ms   round-trip:    ~1.6× FASTER
//   verify-base       3.60ms  (baseline verify)
//   verify-new        3.57ms  verify:        within noise (no change)
//
// Reading: with an empty `on('data')` sink, Node's stream-event machinery is
// highly optimized; the pure-functional gen-bridge can't match it at
// parse-only. The new path's value shows up once the pipeline does real sink
// work (stringer → file) — the idiomatic chain pays an extra Node Duplex
// boundary that the merged writer side-steps. So: ship parseFile for
// ergonomics + completeness; the perf claim is the round-trip case.

import {createReadStream, createWriteStream} from 'node:fs';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {finished} from 'node:stream/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import stringer from '../src/stringer.js';
import verifier from '../src/utils/verifier.js';

import parseFile from '../src/file/parser.js';
import stringerToFile from '../src/file/stringer.js';
import verifyFile from '../src/file/verifier.js';
import pipe from '../src/core/utils/pipe.js';
import drain from '../src/core/utils/drain.js';

// Fixture sized so each iteration is on the order of milliseconds (nano-bench
// finds its batch size automatically). The shape mirrors `bench/parser-jsonc.js`
// (objects with strings/numbers/arrays/nested) so the per-token cost profile
// is comparable across benches.
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

const dir = mkdtempSync(join(tmpdir(), 'sj-file-bench-'));
const srcPath = join(dir, 'in.json');
const dstPath = join(dir, 'out.json');
writeFileSync(srcPath, jsonData);

process.on('exit', () => {
  try {
    rmSync(dir, {recursive: true, force: true});
  } catch {}
});

const drainOnData = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

const drainForAwait = async pipeline => {
  for await (const _ of pipeline) void _;
};

export default {
  async ['chain-base'](n) {
    for (let i = 0; i < n; ++i) {
      await drainOnData(chain([createReadStream(srcPath), parser()]));
    }
  },
  async ['chain-await'](n) {
    for (let i = 0; i < n; ++i) {
      await drainForAwait(chain([createReadStream(srcPath), parser()]));
    }
  },
  async ['parseFile'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(pipe(parseFile())(srcPath));
    }
  },
  async ['roundtrip-base'](n) {
    for (let i = 0; i < n; ++i) {
      const out = createWriteStream(dstPath);
      const c = chain([createReadStream(srcPath), parser(), stringer()]);
      c.pipe(out);
      await finished(out);
    }
  },
  async ['roundtrip-new'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(pipe(parseFile(), stringerToFile(dstPath))(srcPath));
    }
  },
  async ['verify-base'](n) {
    for (let i = 0; i < n; ++i) {
      await new Promise((resolve, reject) => {
        const pipeline = createReadStream(srcPath).pipe(verifier.asStream());
        pipeline.on('finish', resolve);
        pipeline.on('error', reject);
      });
    }
  },
  async ['verify-new'](n) {
    for (let i = 0; i < n; ++i) {
      await verifyFile(srcPath);
    }
  }
};
