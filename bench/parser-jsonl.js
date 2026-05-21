import chain from 'stream-chain';
import {Readable} from 'node:stream';

import parser from '../src/parser.js';
import {streamValues} from '../src/streamers/stream-values.js';
import jsonlParser from '../src/jsonl/parser.js';

// Generate ~100KB JSONL (1000 lines)
const lines = [];
for (let i = 0; i < 1000; ++i) {
  lines.push(
    JSON.stringify({
      id: i,
      name: `item-${i}-${'x'.repeat(20)}`,
      active: i % 2 === 0,
      score: i * 1.5,
      tags: ['alpha', 'beta', 'gamma'],
      nested: {x: i, y: i * 2, label: `nested-${i}`}
    })
  );
}
const jsonlData = lines.join('\n');

const drain = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

export default {
  async ['parser + streamValues'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([Readable.from([jsonlData]), parser({jsonStreaming: true}), streamValues()]));
    }
  },
  async ['jsonl/parser'](n) {
    for (let i = 0; i < n; ++i) {
      await drain(chain([Readable.from([jsonlData]), jsonlParser()]));
    }
  }
};
