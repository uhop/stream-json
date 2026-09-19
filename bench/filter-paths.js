import chain from 'stream-chain';
import {none} from 'stream-chain/core';
import {Readable} from 'node:stream';

import parser from '../src/parser.js';
import pick from '../src/core/filters/pick.js';

// DEPTH containers deep (default 1000, within maxDepth), then a flat run of N values
const DEPTH = +(process.env.DEPTH || 1000),
  N = +(process.env.N || 5000);
const jsonData = '{"a":'.repeat(DEPTH - 1) + '[' + '0,'.repeat(N - 1) + '0]' + '}'.repeat(DEPTH - 1);

const tokens = await new Promise((resolve, reject) => {
  const result = [];
  const pipeline = chain([Readable.from([jsonData]), parser({streamValues: false})]);
  pipeline.on('data', token => result.push(token));
  pipeline.on('end', () => resolve(result));
  pipeline.on('error', reject);
});

const run = (n, filter) => {
  let out = null;
  for (let i = 0; i < n; ++i) {
    const f = pick({filter});
    for (const token of tokens) out = f(token);
    out = f(none);
  }
  return out;
};

export default {
  function: n => run(n, () => false),
  string: n => run(n, 'x'),
  regexp: n => run(n, /^x/)
};
