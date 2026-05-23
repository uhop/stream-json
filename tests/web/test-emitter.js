// Mirror of tests/node/test-emitter.js, scoped to inline JSON (no fs/zlib).
// See tests/web/test-stringer.js for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import {parser} from '../../src/web/parser.js';
import emitter from '../../src/web/emitter.js';
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

const walkInto = (target, counter) => {
  target.addEventListener('startObject', () => ++counter.objects);
  target.addEventListener('keyValue', () => ++counter.keys);
  target.addEventListener('startArray', () => ++counter.arrays);
  target.addEventListener('nullValue', () => ++counter.nulls);
  target.addEventListener('trueValue', () => ++counter.trues);
  target.addEventListener('falseValue', () => ++counter.falses);
  target.addEventListener('numberValue', () => ++counter.numbers);
  target.addEventListener('stringValue', () => ++counter.strings);
};

test.asPromise('emitter (web): event counting', async (t, resolve, reject) => {
  try {
    const plain = new Counter();
    Counter.walk(sample, plain);

    const e = emitter();
    const observed = new Counter();
    walkInto(e, observed);

    const pipeline = chain([readWebString(JSON.stringify(sample)), parser()]);
    await pipeline.readable.pipeTo(e.writable);
    t.deepEqual(observed, plain);
    resolve();
  } catch (err) {
    reject(err);
  }
});

test.asPromise('emitter (web): emit utility', async (t, resolve, reject) => {
  try {
    const plain = new Counter();
    Counter.walk(sample, plain);

    const pipeline = chain([readWebString(JSON.stringify(sample)), parser({streamValues: false})]);
    const target = emit(pipeline.readable);
    const observed = new Counter();
    walkInto(target, observed);

    // Allow the auto-piped pump to drain.
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(observed, plain);
    resolve();
  } catch (err) {
    reject(err);
  }
});

test.asPromise('emitter (web): event.detail carries the token value', async (t, resolve, reject) => {
  try {
    const e = emitter();
    const keys = [];
    const strings = [];
    const numbers = [];
    e.addEventListener('keyValue', ev => keys.push(ev.detail));
    e.addEventListener('stringValue', ev => strings.push(ev.detail));
    e.addEventListener('numberValue', ev => numbers.push(ev.detail));

    const pipeline = chain([readWebString('{"a":"hello","b":42,"c":"world"}'), parser()]);
    await pipeline.readable.pipeTo(e.writable);
    t.deepEqual(keys, ['a', 'b', 'c']);
    t.deepEqual(strings, ['hello', 'world']);
    t.deepEqual(numbers, ['42']);
    resolve();
  } catch (err) {
    reject(err);
  }
});

test('emitter (web): asWebStream === emitter (self-alias)', t => {
  t.equal(emitter.asWebStream, emitter, 'asWebStream is a self-alias for the factory');
});
