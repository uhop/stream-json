import test from 'tape-six';

import parser from '../../src/web/parser.js';
import emitter from '../../src/web/emitter.js';
import emit from '../../src/web/utils/emit.js';

import {Counter} from '../web-helpers.js';

const driveParser = input => {
  const {readable, writable} = parser.asWebStream();
  const w = writable.getWriter();
  w.write(input);
  w.close();
  return readable;
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

test.asPromise('emitter (web): token counts via addEventListener', async (t, resolve, reject) => {
  try {
    const o = {a: [[[]]], b: {a: 1}, c: {a: 1, b: 2}, d: [true, 1, 'x', null, false, true, {}, [], ''], e: 1, f: '', g: true, h: false, i: null, j: [], k: {}};
    const plain = new Counter();
    Counter.walk(o, plain);

    const e = emitter();
    const observed = new Counter();
    walkInto(e, observed);

    await driveParser(JSON.stringify(o)).pipeTo(e.writable);
    t.deepEqual(observed, plain, 'each token category counted identically');
    resolve();
  } catch (err) {
    reject(err);
  }
});

test.asPromise('emitter (web): event.detail carries the token value', async (t, resolve, reject) => {
  try {
    const e = emitter();
    const keys = [],
      strings = [],
      numbers = [];
    e.addEventListener('keyValue', ev => keys.push(ev.detail));
    e.addEventListener('stringValue', ev => strings.push(ev.detail));
    e.addEventListener('numberValue', ev => numbers.push(ev.detail));

    await driveParser('{"a":"hello","b":42,"c":"world"}').pipeTo(e.writable);
    t.deepEqual(keys, ['a', 'b', 'c'], 'keys preserved in order');
    t.deepEqual(strings, ['hello', 'world'], 'string values preserved');
    t.deepEqual(numbers, ['42'], 'numberValue is the raw string per token protocol');
    resolve();
  } catch (err) {
    reject(err);
  }
});

test.asPromise('emit (web): wires a readable directly to an EventTarget', async (t, resolve, reject) => {
  try {
    const o = {a: 1, b: [2, 3], c: null};
    const plain = new Counter();
    Counter.walk(o, plain);

    const target = emit(driveParser(JSON.stringify(o)));
    const observed = new Counter();
    walkInto(target, observed);

    // Allow the auto-piped pump to drain.
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(observed, plain, 'all tokens dispatched on the returned EventTarget');
    resolve();
  } catch (err) {
    reject(err);
  }
});

test.asPromise('emitter.asWebStream === emitter (self-alias)', (t, resolve) => {
  t.equal(emitter.asWebStream, emitter, 'asWebStream is a self-alias for the factory');
  resolve();
});
