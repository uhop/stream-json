// Mirror of tests/node/test-ignore.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import ignore from '../../src/web/filters/ignore.js';
import streamArray from '../../src/web/streamers/stream-array.js';
import stringer from '../../src/web/stringer.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('ignore (web)', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [
      'startArray',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'startObject',
      'endObject',
      'endObject',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'nullValue',
      'endObject',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'startString',
      'stringChunk',
      'endString',
      'endObject',
      'endArray'
    ];
    const pipeline = chain([readWebString(JSON.stringify(input)), ignore.withParser({packKeys: true, packValues: false, filter: stack => stack[0] % 2})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('ignore (web): no streaming', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [
      'startArray',
      'startObject',
      'keyValue',
      'startObject',
      'endObject',
      'endObject',
      'startObject',
      'keyValue',
      'nullValue',
      'endObject',
      'startObject',
      'keyValue',
      'startString',
      'stringChunk',
      'endString',
      'endObject',
      'endArray'
    ];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      ignore.withParser({packKeys: true, packValues: false, streamValues: false, filter: stack => stack[0] % 2})
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('ignore (web): objects', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {c: null}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), ignore.withParser({filter: stack => stack[0] % 2}), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('ignore (web): objects with a string filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), ignore.withParser({filter: '1'}), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('ignore (web): objects with a RegExp filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {}, {}, {}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), ignore.withParser({filter: /\b[1-5]\.[a-d]\b/}), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('ignore (web): empty', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [];
    const pipeline = chain([readWebString(JSON.stringify(input)), ignore.withParser({filter: stack => stack.length}), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('ignore (web): flat object property removal (bug175)', async (t, resolve, reject) => {
  try {
    const input = {StatusCode: 200, StatusMessage: 'Success', Results: 'test'};
    const pipeline = chain([readWebString(JSON.stringify(input)), ignore.withParser({filter: 'Results'}), stringer()]);
    const out = await drain(pipeline);
    const result = JSON.parse(out.join(''));
    t.deepEqual(result, {StatusCode: 200, StatusMessage: 'Success'});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('ignore (web): once', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), ignore.withParser({filter: /\b[1-5]\.[a-d]\b/, once: true}), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});
