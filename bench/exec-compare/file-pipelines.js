// Real-file executor comparison — same workflows as file-process.mjs, but read
// straight off disk every iteration (the OS page cache keeps the bytes warm,
// so this measures the pipeline, not the disk). Run twice — published
// stream-chain vs the linked exec() build — via ./run.sh.
//
//   BENCH_FILES=1 ./run.sh        # uses this module instead of pipelines.js

import {createReadStream, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import chain from 'stream-chain';

import parser from '../../src/parser.js';
import jsonlParser from '../../src/jsonl/parser.js';
import stringer from '../../src/stringer.js';
import disassembler from '../../src/disassembler.js';
import streamArray from '../../src/streamers/stream-array.js';
import pick from '../../src/filters/pick.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const JSON_FILE = here + 'data/sample.json';
const JSONL_FILE = here + 'data/sample.jsonl';

const scHasExec = existsSync(new URL('../exec.js', import.meta.resolve('stream-chain')));
process.stderr.write(`[file-pipelines] executor: ${scHasExec ? 'unified exec() (new)' : 'async applyFns (baseline)'}\n`);

const slimRecord = value => ({
  id: value.id,
  rows: Array.isArray(value.data) ? value.data.length : 0,
  totalCount: Array.isArray(value.data) ? value.data.reduce((s, d) => s + (d.count || 0), 0) : 0
});

const drain = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

export default {
  async ['json-filter (parse→pick→stringify)'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([createReadStream(JSON_FILE), parser(), pick({filter: /\bdata\b/}), stringer()]));
    }
  },
  async ['json-transform (streamArray→map→disasm→stringify)'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([createReadStream(JSON_FILE), parser(), streamArray(), ({value}) => slimRecord(value), disassembler(), stringer()]));
    }
  },
  async ['json-count (streamArray→reduce, no stringer)'](n) {
    for (let i = 0; i < n; ++i) {
      let total = 0;
      await drain(
        chain([
          createReadStream(JSON_FILE),
          parser(),
          streamArray(),
          ({value}) => {
            if (Array.isArray(value.data)) for (const d of value.data) total += d.count || 0;
          }
        ])
      );
    }
  },
  async ['jsonl-transform (jsonl→map→jsonl)'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([createReadStream(JSONL_FILE), jsonlParser(), ({value}) => JSON.stringify(value) + '\n']));
    }
  },
  async ['jsonl-count (jsonl→reduce, no stringer)'](n) {
    for (let i = 0; i < n; ++i) {
      let lines = 0;
      await drain(chain([createReadStream(JSONL_FILE), jsonlParser(), () => void ++lines]));
    }
  }
};
