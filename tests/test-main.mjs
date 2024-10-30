'use strict';

import test from 'tape-six';

import fs from 'node:fs';
import zlib from 'node:zlib';

import makeParser from '../src/index.js';

import {Counter} from './counter.js';

test.asPromise('main source test', (t, resolve, reject) => {
  const plainCounter = new Counter(),
    streamCounter = new Counter(),
    parser = makeParser();

  parser.on('startObject', () => ++streamCounter.objects);
  parser.on('keyValue', () => ++streamCounter.keys);
  parser.on('startArray', () => ++streamCounter.arrays);
  parser.on('nullValue', () => ++streamCounter.nulls);
  parser.on('trueValue', () => ++streamCounter.trues);
  parser.on('falseValue', () => ++streamCounter.falses);
  parser.on('numberValue', () => ++streamCounter.numbers);
  parser.on('stringValue', () => ++streamCounter.strings);

  parser.on('end', () => {
    t.deepEqual(plainCounter, streamCounter);
    resolve();
  });

  const sample = new URL('./data/sample.json.gz', import.meta.url);

  fs.readFile(sample, (err, data) => {
    if (err) return reject(err);

    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      const o = JSON.parse(data);
      Counter.walk(o, plainCounter);

      fs.createReadStream(sample).pipe(zlib.createGunzip()).pipe(parser);
    });
  });
});
