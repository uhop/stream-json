'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import pick from '../src/filters/pick.js';
import streamValues from '../src/streamers/stream-values.js';
import streamArray from '../src/streamers/stream-array.js';
import streamObject from '../src/streamers/stream-object.js';

import readString from './read-string.mjs';

test.asPromise('parser: pick events', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({packValues: false, filter: stack => stack.length === 2})]);

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
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
      'trueValue',
      'endObject'
    ]);
    resolve();
  });
});

test.asPromise('parser: pick packed events', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: stack => stack.length === 2})]);

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
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
  });
});

test.asPromise('parser: pick packed events no streaming', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({streamValues: false, filter: stack => stack.length === 2})]);

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
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
  });
});

test.asPromise('parser: pick objects', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: stack => stack.length === 2}), streamValues()]),
    expected = [{}, [], null, 1, 'e'],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects string filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: '0.a'}), streamValues()]),
    expected = [{}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects regexp filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: /\b[1-5]\.[a-d]\b/}), streamValues()]),
    expected = [[], null, 1],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects empty filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: () => false}), streamValues()]),
    expected = [],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects once', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: /\b[1-5]\.[a-d]\b/, once: true}), streamValues()]),
    expected = [[]],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick array', (t, resolve, reject) => {
  const input = {a: [1, 2, 3], b: {c: 4, d: 5}},
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: 'a'}), streamArray()]),
    expected = [1, 2, 3],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick object', (t, resolve, reject) => {
  const input = {a: [1, 2, 3], b: {c: 4, d: 5}},
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: 'b'}), streamObject()]),
    expected = [4, 5],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});
