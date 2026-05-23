// Mirror of tests/node/test-replace.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain, none, many} from 'stream-chain/web';

import replace from '../../src/web/filters/replace.js';
import streamArray from '../../src/web/streamers/stream-array.js';
import stringer from '../../src/web/stringer.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('replace (web)', async (t, resolve, reject) => {
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
    const pipeline = chain([readWebString(JSON.stringify(input)), replace.withParser({packValues: false, filter: stack => stack[0] % 2})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

const nullToken = {name: 'nullValue', value: null};

test.asPromise('replace (web): nulls for arrays', async (t, resolve, reject) => {
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
      'nullValue',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'nullValue',
      'endObject',
      'nullValue',
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
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({
        packValues: false,
        filter: stack => stack[0] % 2,
        replacement: stack => (stack.length && typeof stack[stack.length - 1] == 'number' ? nullToken : none)
      })
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): no streaming', async (t, resolve, reject) => {
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
      'stringValue',
      'endObject',
      'endArray'
    ];
    const pipeline = chain([readWebString(JSON.stringify(input)), replace.withParser({streamValues: false, filter: stack => stack[0] % 2})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.name);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): objects', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {c: null}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), replace.withParser({filter: stack => stack[0] % 2}), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): objects with a string filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([readWebString(JSON.stringify(input)), replace.withParser({filter: '1'}), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): objects with a RegExp filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {b: null}, {c: null}, {d: null}, {e: 'e'}];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({filter: /\b[1-5]\.[a-d]\b/, replacement: () => nullToken}),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): empty', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [null, null, null, null, null];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({filter: stack => stack.length, replacement: () => nullToken}),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): objects once w/ RegExp filter', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: {}}, {b: null}, {c: null}, {d: 1}, {e: 'e'}];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({filter: /\b[1-5]\.[a-d]\b/, once: true, replacement: () => nullToken}),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): many', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: 0}, {b: 0}, {c: 0}, {d: 0}, {e: 0}];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: many([{name: 'startNumber'}, {name: 'numberChunk', value: '0'}, {name: 'endNumber'}, {name: 'numberValue', value: '0'}])
      }),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): array', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: 0}, {b: 0}, {c: 0}, {d: 0}, {e: 0}];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: [{name: 'startNumber'}, {name: 'numberChunk', value: '0'}, {name: 'endNumber'}, {name: 'numberValue', value: '0'}]
      }),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): string', async (t, resolve, reject) => {
  try {
    const replacement = (_stack, chunk) => [
      {name: 'startString'},
      {name: 'stringChunk', value: chunk.name},
      {name: 'endString'},
      {name: 'stringValue', value: chunk.name}
    ];

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: 'startObject'}, {b: 'startArray'}, {c: 'nullValue'}, {d: 'startNumber'}, {e: 'startString'}];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement
      }),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): empty replacement', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{}, {}, {}, {}, {}];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: () => none
      }),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): null replacement', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}];
    const expected = [{a: null}, {b: null}, {c: null}, {d: null}, {e: null}];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: () => nullToken
      }),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): empty replacement on flat object (bug175)', async (t, resolve, reject) => {
  try {
    const input = {StatusCode: 200, StatusMessage: 'Success', Results: 'test'};
    const pipeline = chain([readWebString(JSON.stringify(input)), replace.withParser({filter: 'Results', replacement: []}), stringer()]);
    const out = await drain(pipeline);
    const result = JSON.parse(out.join(''));
    t.deepEqual(result, {StatusCode: 200, StatusMessage: 'Success'});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): bug63', async (t, resolve, reject) => {
  try {
    const input = [true, 42, {a: true, b: 42, c: 'hello'}, 'hello'];
    const expected = [true, 42, {a: true, b: 0, c: 'hello'}, 'hello'];
    const pipeline = chain([
      readWebString(JSON.stringify(input)),
      replace.withParser({
        packValues: true,
        streamValues: false,
        filter: '2.b',
        replacement: {name: 'numberValue', value: '0'}
      }),
      streamArray()
    ]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
});
