// Mirror of the jsonl stringer scenarios from tests/node/test-jsonl.js.
// See tests/web/test-stringer.js for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import jsonlParser from '../../src/web/jsonl/parser.js';
import jsonlStringer from '../../src/web/jsonl/stringer.js';

import {readWebString, drain} from '../web-helpers.js';

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

const pattern = {
  a: [[[]]],
  b: {a: 1},
  c: {a: 1, b: 2},
  d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
  e: 1,
  f: '',
  g: true,
  h: false,
  i: null,
  j: [],
  k: {}
};

test.asPromise('jsonl stringer (web): single', async (t, resolve, reject) => {
  try {
    const string = JSON.stringify(pattern);
    const pipeline = chain([readWebString(string), jsonlParser(), chunk => chunk.value, jsonlStringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), string);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonl stringer (web): multiple', async (t, resolve, reject) => {
  try {
    const string = JSON.stringify(pattern);
    const expected = string + '\n' + string + '\n' + string;
    const pipeline = chain([readWebString(expected + '\n'), jsonlParser(), chunk => chunk.value, jsonlStringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonl stringer (web): custom separator', async (t, resolve, reject) => {
  try {
    const pipeline = chain([fromArray([{a: 1}, {b: 2}, {c: 3}]), jsonlStringer({separator: '\r\n'})]);
    const out = await drain(pipeline);
    t.equal(out.join(''), '{"a":1}\r\n{"b":2}\r\n{"c":3}');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonl stringer (web): default separator', async (t, resolve, reject) => {
  try {
    const pipeline = chain([fromArray([1, 2, 3]), jsonlStringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), '1\n2\n3');
    resolve();
  } catch (e) {
    reject(e);
  }
});
