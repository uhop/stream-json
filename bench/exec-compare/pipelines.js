// Executor-comparison benchmark for stream-json.
//
// Measures realistic end-to-end stream-json pipelines so the published
// stream-chain executor (async `applyFns`) can be compared against the
// unpublished unified `exec()` executor. Run the same file twice:
//
//   1. baseline — with the published `stream-chain` from node_modules
//   2. linked   — after `npm link stream-chain` against ~/Open/stream-chain
//
// then diff the two nano-bench reports. See ./run.sh and ./RESULTS.md.
//
// Each workflow drains a full document per iteration, so the per-op time is
// the whole-pipeline wall-time — that is what a user actually pays. Four
// workflows deliberately span the executor-sensitive paths:
//
//   W1 parse→stringify  — pure token gen/asStream throughput (heaviest token count)
//   W2 parse→map→stringify — inserts a per-token fn-list section (exec/fun path)
//   W3 streamArray→map→disassemble→stringify — object round-trip; plain JS map fn
//   W4 jsonl→map        — whole-object path + a serialize map fn
//
// Data size is tunable via BENCH_COUNT (objects/lines, default 5000 ≈ ~0.9 MB).

import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {Readable} from 'node:stream';

import chain from 'stream-chain';

import parser from '../../src/parser.js';
import jsonlParser from '../../src/jsonl/parser.js';
import stringer from '../../src/stringer.js';
import disassembler from '../../src/disassembler.js';
import streamArray from '../../src/streamers/stream-array.js';

// --- which stream-chain are we measuring? (printed once, to stderr) ---
const scEntry = fileURLToPath(import.meta.resolve('stream-chain'));
const scHasExec = existsSync(new URL('../exec.js', import.meta.resolve('stream-chain')));
process.stderr.write(
  `[exec-compare] stream-chain: ${scEntry}\n` +
    `[exec-compare] executor: ${scHasExec ? 'unified exec() (linked/new)' : 'async applyFns (published/baseline)'}\n`
);

// --- data ---
const COUNT = Number(process.env.BENCH_COUNT) || 5000;
const makeItem = i => ({
  id: i,
  name: `item-${i}-${'x'.repeat(20)}`,
  active: i % 2 === 0,
  score: i * 1.5,
  tags: ['alpha', 'beta', 'gamma'],
  nested: {x: i, y: i * 2, label: `nested-${i}`}
});

const items = Array.from({length: COUNT}, (_, i) => makeItem(i));
const jsonData = JSON.stringify(items);
const jsonlData = items.map(o => JSON.stringify(o)).join('\n');
process.stderr.write(
  `[exec-compare] COUNT=${COUNT}  json=${(jsonData.length / 1048576).toFixed(2)}MB  jsonl=${(jsonlData.length / 1048576).toFixed(2)}MB\n`
);

const drain = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

// W2: light per-token transform — uppercases string values, passes the rest
// through. A bare function inside chain() is its own fn-list section, exactly
// the boundary the executor change governs.
const upcaseStringTokens = token =>
  token.name === 'stringValue' ? {name: 'stringValue', value: token.value.toUpperCase()} : token;

// W3: light per-object transform on the assembled value.
const processValue = ({value}) => ({...value, score: value.score * 2, processed: true});

// W4: parse a JSONL object, modify it, serialize back to a line.
const processLine = obj => JSON.stringify({...obj, processed: true});

export default {
  async ['W1 parse→stringify (tokens)'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([Readable.from([jsonData]), parser(), stringer()]));
    }
  },
  async ['W2 parse→map→stringify (token fn)'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([Readable.from([jsonData]), parser(), upcaseStringTokens, stringer()]));
    }
  },
  async ['W3 streamArray→map→disassemble→stringify'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(
        chain([Readable.from([jsonData]), parser(), streamArray(), processValue, disassembler(), stringer()])
      );
    }
  },
  async ['W4 jsonl→map (objects)'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([Readable.from([jsonlData]), jsonlParser(), processLine]));
    }
  }
};
