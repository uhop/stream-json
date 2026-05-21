import chain from 'stream-chain';
import {Readable} from 'node:stream';

import parser from '../src/parser.js';
import jsoncParser from '../src/jsonc/parser.js';

// Generate ~100KB JSON array
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

const drain = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

export default {
  async parser(n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([Readable.from([jsonData]), parser()]));
    }
  },
  async ['jsonc/parser'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([Readable.from([jsonData]), jsoncParser()]));
    }
  }
};
