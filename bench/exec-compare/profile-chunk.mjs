#!/usr/bin/env node
// Profile the same document + pipeline at a chosen input chunk size.
//   node --cpu-prof ... profile-chunk.mjs <chunkBytes|whole> <iterations>
import {Readable} from 'node:stream';
import chain from 'stream-chain';
import parser from '../../src/parser.js';
import stringer from '../../src/stringer.js';

const COUNT = Number(process.env.BENCH_COUNT) || 2000;
const items = Array.from({length: COUNT}, (_, i) => ({
  id: i,
  name: `item-${i}-${'x'.repeat(20)}`,
  active: i % 2 === 0,
  score: i * 1.5,
  tags: ['alpha', 'beta', 'gamma'],
  nested: {x: i, y: i * 2, label: `nested-${i}`}
}));
const json = JSON.stringify(items);

const arg = (process.argv[2] || 'whole').toLowerCase();
const size = arg === 'whole' ? Infinity : Number(arg);
const iters = Number(process.argv[3]) || 200;

const parts = size >= json.length ? [json] : [];
if (parts.length === 0) for (let i = 0; i < json.length; i += size) parts.push(json.slice(i, i + size));

const drain = p => new Promise((res, rej) => (p.on('data', () => {}), p.on('end', res), p.on('error', rej)));

const t0 = performance.now();
for (let i = 0; i < iters; ++i) await drain(chain([Readable.from(parts), parser(), stringer()]));
console.error(`chunk=${arg} parts=${parts.length} ×${iters}: ${(performance.now() - t0).toFixed(0)} ms`);
