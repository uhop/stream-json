import chain from 'stream-chain';
import {Readable} from 'node:stream';

import parser from '../src/parser.js';
import Assembler from '../src/assembler.js';
import FlexAssembler from '../src/utils/flex-assembler.js';

// Generate ~50KB JSON object
const items = [];
for (let i = 0; i < 500; ++i) {
  items.push({
    id: i,
    name: `item-${i}`,
    active: i % 2 === 0,
    score: i * 1.5,
    tags: ['alpha', 'beta'],
    nested: {x: i, y: i * 2}
  });
}
const jsonData = JSON.stringify(items);

// Pre-generate token array
const tokens = await new Promise((resolve, reject) => {
  const result = [];
  const pipeline = chain([Readable.from([jsonData]), parser()]);
  pipeline.on('data', token => result.push(token));
  pipeline.on('end', () => resolve(result));
  pipeline.on('error', reject);
});

export default {
  assembler(n) {
    for (let i = 0; i < n; ++i) {
      const asm = new Assembler();
      for (const token of tokens) asm.consume(token);
    }
  },
  ['flex-assembler'](n) {
    for (let i = 0; i < n; ++i) {
      const asm = new FlexAssembler();
      for (const token of tokens) asm.consume(token);
    }
  },
  ['flex-assembler (Map rules)'](n) {
    for (let i = 0; i < n; ++i) {
      const asm = new FlexAssembler({
        objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
      });
      for (const token of tokens) asm.consume(token);
    }
  }
};
