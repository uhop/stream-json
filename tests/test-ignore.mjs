'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import ignore from '../src/filters/ignore.js';
import streamArray from '../src/streamers/stream-array.js';

import readString from './read-string.mjs';

test.asPromise('ignore', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), ignore.withParser({packKeys: true, packValues: false, filter: stack => stack[0] % 2})]),
    expected = [
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
    ],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('ignore: no streaming', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      ignore.withParser({packKeys: true, packValues: false, streamValues: false, filter: stack => stack[0] % 2})
    ]),
    expected = [
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
    ],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('ignore: objects', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), ignore.withParser({filter: stack => stack[0] % 2}), streamArray()]),
    expected = [{a: {}}, {c: null}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('ignore: objects with a string filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), ignore.withParser({filter: '1'}), streamArray()]),
    expected = [{a: {}}, {c: null}, {d: 1}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('ignore: objects with a RegExp filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), ignore.withParser({filter: /\b[1-5]\.[a-d]\b/}), streamArray()]),
    expected = [{a: {}}, {}, {}, {}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('ignore: empty', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), ignore.withParser({filter: stack => stack.length}), streamArray()]),
    expected = [],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('ignore: once', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), ignore.withParser({filter: /\b[1-5]\.[a-d]\b/, once: true}), streamArray()]),
    expected = [{a: {}}, {}, {c: null}, {d: 1}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});
