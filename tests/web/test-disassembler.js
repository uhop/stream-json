// Mirror of tests/node/test-disassembler.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import {parser} from '../../src/web/parser.js';
import disassembler from '../../src/web/disassembler.js';
import pick from '../../src/web/filters/pick.js';
import streamArray from '../../src/web/streamers/stream-array.js';
import streamValues from '../../src/web/streamers/stream-values.js';

import {readWebString, drain} from '../web-helpers.js';

const sanitize = x => {
  x = JSON.stringify(x);
  return typeof x == 'string' ? JSON.parse(x) : x;
};

const sanitizeWithReplacer = replacer => x => {
  x = JSON.stringify(x, replacer);
  return typeof x == 'string' ? JSON.parse(x) : x;
};

// Wrap an array of JS values as a ReadableStream — equivalent of pushing
// values directly into a chain's writable side on Node.
const fromArray = values => {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < values.length) controller.enqueue(values[i++]);
      else controller.close();
    }
  });
};

test.asPromise('disassembler (web): roundtrip', async (t, resolve, reject) => {
  try {
    const input = [1, 2, null, true, false, {}, [], {a: {b: {c: [{d: 1}]}}}, [[[]]]];
    const pipeline = chain([readWebString(JSON.stringify(input)), parser(), streamArray(), disassembler(), pick({filter: 'value'}), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, input);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): bad top-level values', async (t, resolve, reject) => {
  try {
    const input = [1, () => {}, 2, undefined, 3, Symbol(), 4];
    const pipeline = chain([fromArray(input), disassembler(), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, [1, 2, 3, 4]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): bad values in object', async (t, resolve, reject) => {
  try {
    const input = [{a: 1, b: () => {}, c: 2, d: undefined, e: 3, f: Symbol(), g: 4}];
    const pipeline = chain([fromArray(input), disassembler(), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, [{a: 1, c: 2, e: 3, g: 4}]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): bad values in array', async (t, resolve, reject) => {
  try {
    const input = [[1, () => {}, 2, undefined, 3, Symbol(), 4]];
    const pipeline = chain([fromArray(input), disassembler(), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, [[1, null, 2, null, 3, null, 4]]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): dates', async (t, resolve, reject) => {
  try {
    const date = new Date();
    const input = [1, date, 2];
    const pipeline = chain([fromArray(input), disassembler(), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, [1, date.toJSON(''), 2]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): chained toJSON', async (t, resolve, reject) => {
  try {
    const x = {a: 1};
    const y = {
      b: 2,
      toJSON() {
        return x;
      }
    };
    const z = {
      c: 3,
      toJSON() {
        return y;
      }
    };

    const input = [x, y, z];
    const shouldBe = input.map(sanitize);
    const pipeline = chain([fromArray(input), disassembler(), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): custom toJSON', async (t, resolve, reject) => {
  try {
    const x = {
      a: 1,
      toJSON(k) {
        if (k !== '1' && k !== 'b') return 5;
      }
    };

    const input = [x, x, {a: x, b: x}, [x, x]];
    const shouldBe = input.map(sanitize);
    const pipeline = chain([fromArray(input), disassembler(), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): custom toJSON filter top level', async (t, resolve, reject) => {
  try {
    const x = {
      a: 1,
      toJSON(k) {
        if (k !== '') return 5;
      }
    };

    const input = [x, x, {a: x, b: x}, [x, x]];
    const shouldBe = input.map(sanitize).filter(item => item !== undefined);
    const pipeline = chain([fromArray(input), disassembler(), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): custom replacer', async (t, resolve, reject) => {
  try {
    const replacer = (k, v) => {
      if (k === '1' || k === 'b') return 5;
      if (k === '0' || k === 'c') return;
      return v;
    };

    const input = [1, 2, {a: 3, b: 4, c: 7}, [5, 6]];
    const shouldBe = input.map(sanitizeWithReplacer(replacer));
    const pipeline = chain([fromArray(input), disassembler({replacer}), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): custom replacer filter top level', async (t, resolve, reject) => {
  try {
    const replacer = (k, v) => {
      if (k === '' && typeof v == 'number') return;
      if (k === '1' || k === 'b') return 5;
      if (k === '0' || k === 'c') return;
      return v;
    };

    const input = [1, 2, {a: 3, b: 4, c: 7}, [5, 6]];
    const shouldBe = input.map(sanitizeWithReplacer(replacer)).filter(item => item !== undefined);
    const pipeline = chain([fromArray(input), disassembler({replacer}), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): custom replacer array', async (t, resolve, reject) => {
  try {
    const replacer = ['a', 'b'];

    const input = [1, 2, {a: 3, b: {a: 8, b: 9, c: 10}, c: 7}, [5, 6]];
    const shouldBe = input.map(sanitizeWithReplacer(replacer));
    const pipeline = chain([fromArray(input), disassembler({replacer}), streamValues()]);
    const out = await drain(pipeline);
    const result = out.map(item => item.value);
    t.deepEqual(result, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test('disassembler (web): NaN streamValues=false yields only nullValue', t => {
  const fn = disassembler({streamValues: false});
  const tokens = [...fn(NaN)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('disassembler (web): NaN yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(NaN)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('disassembler (web): Infinity yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(Infinity)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('disassembler (web): -Infinity yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(-Infinity)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});
