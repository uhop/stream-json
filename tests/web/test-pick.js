// Mirror of tests/node/test-pick.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import pick from '../../src/web/filters/pick.js';
import {assembler} from '../../src/web/assembler.js';
import streamValues from '../../src/web/streamers/stream-values.js';
import streamArray from '../../src/web/streamers/stream-array.js';
import streamObject from '../../src/web/streamers/stream-object.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('parser (web): pick events', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({packValues: false, filter: stack => stack.length === 2})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, [
      'startObject',
      'endObject',
      'startArray',
      'endArray',
      'nullValue',
      'startNumber',
      'numberChunk',
      'endNumber',
      'startString',
      'stringChunk',
      'endString',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'trueValue',
      'endObject'
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick packed events', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: stack => stack.length === 2})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, [
      'startObject',
      'endObject',
      'startArray',
      'endArray',
      'nullValue',
      'startNumber',
      'numberChunk',
      'endNumber',
      'numberValue',
      'startString',
      'stringChunk',
      'endString',
      'stringValue',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'trueValue',
      'endObject'
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick packed events no streaming', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({streamValues: false, filter: stack => stack.length === 2})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, [
      'startObject',
      'endObject',
      'startArray',
      'endArray',
      'nullValue',
      'numberValue',
      'stringValue',
      'startObject',
      'keyValue',
      'trueValue',
      'endObject'
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick objects', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: stack => stack.length === 2}), streamValues()]);
    const expected = [{}, [], null, 1, 'e'];
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick objects string filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: '0.a'}), streamValues()]);
    const expected = [{}];
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick objects regexp filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: /\b[1-5]\.[a-d]\b/}), streamValues()]);
    const expected = [[], null, 1];
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick objects empty filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: () => false}), streamValues()]);
    const expected = [];
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick objects once', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: /\b[1-5]\.[a-d]\b/, once: true}), streamValues()]);
    const expected = [[]];
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick array', async (t, resolve, reject) => {
  try {
    const input = {a: [1, 2, 3], b: {c: 4, d: 5}};
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: 'a'}), streamArray()]);
    const expected = [1, 2, 3];
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick object', async (t, resolve, reject) => {
  try {
    const input = {a: [1, 2, 3], b: {c: 4, d: 5}};
    const pipeline = chain([readWebString(JSON.stringify(input)), pick.withParser({filter: 'b'}), streamObject()]);
    const expected = [4, 5];
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pick with global RegExp flag', async (t, resolve, reject) => {
  try {
    const data = {a: 1, b: 2, a2: 3};
    const asm = assembler();
    const pipeline = chain([readWebString(JSON.stringify(data)), pick.withParser({filter: /^a/g, streamValues: false}), asm.tapChain]);
    const results = await drain(pipeline);
    t.equal(results[0], 1);
    t.equal(results[1], 3);
    resolve();
  } catch (e) {
    reject(e);
  }
});
