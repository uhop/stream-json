#!/usr/bin/env node
// Simple, real file-to-file stream-json program.
//
//   node file-process.mjs <workflow> <input-file> [output-file]
//
// Reads an actual file from disk with fs.createReadStream and writes the
// result with fs.createWriteStream. Some workflows end with a stringer (JSON
// text out); others are pure data-processing that emit a small computed
// summary (no stringer).
//
// Workflows:
//   json-filter     JSON -> parser -> pick(data subtrees) -> stringer  (stringer)
//   json-transform  JSON -> streamArray -> slim each -> disassembler -> stringer
//   json-count      JSON -> streamArray -> aggregate -> summary        (no stringer)
//   jsonl-transform JSONL -> jsonlParser -> slim each line -> JSONL     (no stringer)
//   jsonl-count     JSONL -> jsonlParser -> aggregate -> summary        (no stringer)
//
// Example:
//   node file-process.mjs json-filter data/sample.json out/data.json
//   node file-process.mjs jsonl-count data/sample.jsonl out/summary.json

import {createReadStream, createWriteStream, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {pipeline as pipelineCb} from 'node:stream';
import {promisify} from 'node:util';

import chain from 'stream-chain';

import parser from '../../src/parser.js';
import jsonlParser from '../../src/jsonl/parser.js';
import stringer from '../../src/stringer.js';
import disassembler from '../../src/disassembler.js';
import streamArray from '../../src/streamers/stream-array.js';
import pick from '../../src/filters/pick.js';

const pipeline = promisify(pipelineCb);

// --- per-element transforms (the "light processing") ---------------------

// JSON sample element: {fields, data: [{count, field, age, ...}], id, name}.
// Drop the heavy data[] and keep a computed total instead.
const slimRecord = value => ({
  id: value.id,
  name: value.name,
  rows: Array.isArray(value.data) ? value.data.length : 0,
  totalCount: Array.isArray(value.data) ? value.data.reduce((s, d) => s + (d.count || 0), 0) : 0
});

// JSONL sample line: a bibliographic record. Slim + tag it.
const slimLine = value => ({title: value.Title, author: value.Author, year: value['Date Added'], processed: true});

// --- workflows -----------------------------------------------------------

const workflows = {
  // Token-level: pull every `data` subtree out of the JSON and re-stringify
  // them — never assembles a JS object. Output is a stream of JSON values.
  async ['json-filter'](input, output) {
    await pipeline(createReadStream(input), chain([parser(), pick({filter: /\bdata\b/}), stringer()]), createWriteStream(output));
  },

  // Object-level round-trip: assemble each array element, slim it, then turn
  // it back into a token stream and stringify. Exercises disassembler+stringer.
  async ['json-transform'](input, output) {
    await pipeline(
      createReadStream(input),
      chain([parser(), streamArray(), ({value}) => slimRecord(value), disassembler(), stringer()]),
      createWriteStream(output)
    );
  },

  // Pure data processing — aggregate, write one summary object. No stringer.
  async ['json-count'](input, output) {
    let elements = 0,
      rows = 0,
      totalCount = 0;
    await drain(
      chain([
        createReadStream(input),
        parser(),
        streamArray(),
        ({value}) => {
          ++elements;
          if (Array.isArray(value.data)) {
            rows += value.data.length;
            for (const d of value.data) totalCount += d.count || 0;
          }
        }
      ])
    );
    writeJson(output, {elements, rows, totalCount});
  },

  // JSONL -> slim each object -> JSONL back out.
  async ['jsonl-transform'](input, output) {
    await pipeline(createReadStream(input), chain([jsonlParser(), ({value}) => JSON.stringify(slimLine(value)) + '\n']), createWriteStream(output));
  },

  // JSONL -> aggregate (count by year) -> one summary object. No stringer.
  async ['jsonl-count'](input, output) {
    let lines = 0;
    const byYear = {};
    await drain(
      chain([
        createReadStream(input),
        jsonlParser(),
        ({value}) => {
          ++lines;
          const y = String(value['Date Added'] || 'unknown');
          byYear[y] = (byYear[y] || 0) + 1;
        }
      ])
    );
    writeJson(output, {lines, distinctYears: Object.keys(byYear).length, byYear});
  }
};

// --- helpers -------------------------------------------------------------

const drain = stream =>
  new Promise((resolve, reject) => {
    stream.on('data', () => {});
    stream.on('end', resolve);
    stream.on('error', reject);
  });

const writeJson = (output, obj) => {
  mkdirSync(dirname(output), {recursive: true});
  createWriteStream(output).end(JSON.stringify(obj, null, 2) + '\n');
};

// --- main ----------------------------------------------------------------

const [, , workflow, input, output = 'out/result.json'] = process.argv;
if (!workflow || !input || !workflows[workflow]) {
  console.error(`usage: node file-process.mjs <workflow> <input> [output]
workflows: ${Object.keys(workflows).join(', ')}`);
  process.exit(1);
}

mkdirSync(dirname(output), {recursive: true});
const t0 = performance.now();
await workflows[workflow](input, output);
console.error(`${workflow}: ${input} -> ${output}  (${(performance.now() - t0).toFixed(1)} ms)`);
