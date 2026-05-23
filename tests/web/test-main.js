// Mirror of tests/node/test-main.js, scoped to inline JSON (no fs/zlib).
// See tests/web/test-stringer.js for the substrate-mirroring conventions.

import test from 'tape-six';

import parserWebStream from '../../src/web/index.js';
import emit from '../../src/web/utils/emit.js';

import {readWebString, Counter} from '../web-helpers.js';

const sample = {
  a: [[[]]],
  b: {a: 1},
  c: {a: 1, b: 2},
  d: [true, 1, 'x', null, false, true, {}, [], ''],
  e: 1,
  f: '',
  g: true,
  h: false,
  i: null,
  j: [],
  k: {}
};

test.asPromise('main source test (web)', async (t, resolve, reject) => {
  try {
    const plain = new Counter();
    const observed = new Counter();
    Counter.walk(sample, plain);

    const {readable, writable} = parserWebStream();
    readWebString(JSON.stringify(sample)).pipeTo(writable);
    const target = emit(readable);

    target.addEventListener('startObject', () => ++observed.objects);
    target.addEventListener('keyValue', () => ++observed.keys);
    target.addEventListener('startArray', () => ++observed.arrays);
    target.addEventListener('nullValue', () => ++observed.nulls);
    target.addEventListener('trueValue', () => ++observed.trues);
    target.addEventListener('falseValue', () => ++observed.falses);
    target.addEventListener('numberValue', () => ++observed.numbers);
    target.addEventListener('stringValue', () => ++observed.strings);

    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(plain, observed);
    resolve();
  } catch (err) {
    reject(err);
  }
});
