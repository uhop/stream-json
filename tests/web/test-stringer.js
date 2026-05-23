// Mirror of tests/node/test-stringer.js, scenario-for-scenario, exercised through
// the Web Streams substrate.
//
// The structural difference between substrates is minimized: both tests build
// the same `chain([readSource(...), parser(), stringer({...})])` pipeline, with
// substrate-specific imports (`stream-chain` vs `stream-chain/web`,
// `readString` vs `readWebString`) and a single substrate-agnostic `drain()`
// helper for output collection. Component factories (`parser`, `stringer`)
// take identical call sites — `chain` auto-wraps the returned flushables for
// whichever substrate it was imported from.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import {parser} from '../../src/web/parser.js';
import stringer from '../../src/web/stringer.js';

import {readWebString, drain} from '../web-helpers.js';

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

test.asPromise('stringer (web): roundtrip', async (t, resolve, reject) => {
  try {
    const string = JSON.stringify(pattern);
    const pipeline = chain([readWebString(string), parser(), stringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), string);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): no packing', async (t, resolve, reject) => {
  try {
    const string = JSON.stringify(pattern);
    const pipeline = chain([readWebString(string), parser({packValues: false}), stringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), string);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): useValues', async (t, resolve, reject) => {
  try {
    const string = JSON.stringify(pattern);
    const pipeline = chain([readWebString(string), parser(), stringer({useValues: true})]);
    const out = await drain(pipeline);
    t.equal(out.join(''), string);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): json streaming objects', async (t, resolve, reject) => {
  try {
    let string = JSON.stringify(pattern);
    string += string;
    const pipeline = chain([readWebString(string), parser({jsonStreaming: true}), stringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), string);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): json streaming objects as array', async (t, resolve, reject) => {
  try {
    let string = JSON.stringify(pattern);
    const shouldBe = '[' + string + ',' + string + ']';
    string += string;
    const pipeline = chain([readWebString(string), parser({jsonStreaming: true}), stringer({makeArray: true})]);
    const out = await drain(pipeline);
    t.equal(out.join(''), shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): no input as array', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString(''), parser({jsonStreaming: true}), stringer({makeArray: true})]);
    const out = await drain(pipeline);
    t.equal(out.join(''), '[]');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): json streaming primitives', async (t, resolve, reject) => {
  try {
    const string = '1 2 "zzz" "z\'z\\"z" null true false 1[]null{}true';
    const pipeline = chain([readWebString(string), parser({jsonStreaming: true}), stringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), string);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): special symbols', async (t, resolve, reject) => {
  try {
    const object = {
      message: 'Test\tmessage\nWith\bnew\flineAndControlCharacters\r\ntest\\...'
    };
    const string = JSON.stringify(object);
    const pipeline = chain([readWebString(string), parser({jsonStreaming: true}), stringer()]);
    const out = await drain(pipeline);
    t.equal(out.join(''), string);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): control characters with useValues', async (t, resolve, reject) => {
  try {
    const input = '{"a":"hello\\nworld\\t!\\u0000end"}';
    const pipeline = chain([readWebString(input), parser(), stringer({useValues: true})]);
    const out = await drain(pipeline);
    t.equal(out.join(''), '{"a":"hello\\nworld\\t!\\u0000end"}');
    resolve();
  } catch (e) {
    reject(e);
  }
});
