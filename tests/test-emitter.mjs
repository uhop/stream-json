import fs from 'node:fs';
import zlib from 'node:zlib';

import test from 'tape-six';

import parser from '../src/parser.js';
import emitter from '../src/emitter.js';
import emit from '../src/utils/emit.js';

import Counter from './counter.mjs';

test.asPromise('emitter: event counting', (t, resolve, reject) => {
  const plainCounter = new Counter(),
    emitterCounter = new Counter(),
    p = parser.asStream(),
    e = emitter();

  p.pipe(e);

  e.on('startObject', () => ++emitterCounter.objects);
  e.on('keyValue', () => ++emitterCounter.keys);
  e.on('startArray', () => ++emitterCounter.arrays);
  e.on('nullValue', () => ++emitterCounter.nulls);
  e.on('trueValue', () => ++emitterCounter.trues);
  e.on('falseValue', () => ++emitterCounter.falses);
  e.on('numberValue', () => ++emitterCounter.numbers);
  e.on('stringValue', () => ++emitterCounter.strings);

  e.on('finish', () => {
    t.deepEqual(emitterCounter, plainCounter);
    resolve();
  });
  e.on('error', reject);

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);
    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      const o = JSON.parse(data);
      Counter.walk(o, plainCounter);

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(p);
    });
  });
});

test.asPromise('emitter: emit utility', (t, resolve, reject) => {
  const plainCounter = new Counter(),
    emitterCounter = new Counter(),
    p = emit(parser.asStream({streamValues: false}));

  p.on('startObject', () => ++emitterCounter.objects);
  p.on('keyValue', () => ++emitterCounter.keys);
  p.on('startArray', () => ++emitterCounter.arrays);
  p.on('nullValue', () => ++emitterCounter.nulls);
  p.on('trueValue', () => ++emitterCounter.trues);
  p.on('falseValue', () => ++emitterCounter.falses);
  p.on('numberValue', () => ++emitterCounter.numbers);
  p.on('stringValue', () => ++emitterCounter.strings);

  p.on('finish', () => {
    t.deepEqual(emitterCounter, plainCounter);
    resolve();
  });
  p.on('error', reject);

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);
    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      const o = JSON.parse(data);
      Counter.walk(o, plainCounter);

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(p);
    });
  });
});
