import fs from 'node:fs';
import zlib from 'node:zlib';

import test from 'tape-six';

import parser from '../src/parser.js';
import Emitter from '../src/emitter.js';
import emit from '../src/utils/emit.js';

import Counter from './counter.mjs';

test.asPromise('emitter: event counting', (t, resolve, reject) => {
  const plainCounter = new Counter(),
    emitterCounter = new Counter(),
    p = parser.asStream(),
    emitter = Emitter.make();

  p.pipe(emitter);

  emitter.on('startObject', () => ++emitterCounter.objects);
  emitter.on('keyValue', () => ++emitterCounter.keys);
  emitter.on('startArray', () => ++emitterCounter.arrays);
  emitter.on('nullValue', () => ++emitterCounter.nulls);
  emitter.on('trueValue', () => ++emitterCounter.trues);
  emitter.on('falseValue', () => ++emitterCounter.falses);
  emitter.on('numberValue', () => ++emitterCounter.numbers);
  emitter.on('stringValue', () => ++emitterCounter.strings);

  emitter.on('finish', () => {
    t.deepEqual(emitterCounter, plainCounter);
    resolve();
  });
  emitter.on('error', reject);

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
