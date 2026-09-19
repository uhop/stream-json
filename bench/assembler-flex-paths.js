import chain from 'stream-chain';
import {Readable} from 'node:stream';

import parser from '../src/parser.js';
import FlexAssembler from '../src/utils/flex-assembler.js';

// DEPTH containers deep (default 1000, within maxDepth), then a flat run of N empty arrays
const DEPTH = +(process.env.DEPTH || 1000),
  N = +(process.env.N || 5000);
const jsonData = '['.repeat(DEPTH - 1) + '[' + '[],'.repeat(N - 1) + '[]]' + ']'.repeat(DEPTH - 1);

const tokens = await new Promise((resolve, reject) => {
  const result = [];
  const pipeline = chain([Readable.from([jsonData]), parser()]);
  pipeline.on('data', token => result.push(token));
  pipeline.on('end', () => resolve(result));
  pipeline.on('error', reject);
});

const run = (n, filter) => {
  let out = null;
  for (let i = 0; i < n; ++i) {
    const asm = new FlexAssembler({arrayRules: [{filter, create: () => [], add: (a, v) => a.push(v)}]});
    for (const token of tokens) asm.consume(token);
    out = asm.current;
  }
  return out;
};

export default {
  function: n => run(n, () => false),
  string: n => run(n, 'x'),
  regexp: n => run(n, /^x/)
};
