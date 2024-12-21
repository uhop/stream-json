'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import filter from '../src/filters/filter.js';
import {assembler} from '../src/assembler.js';

import readString from './read-string.mjs';

test.asPromise('filter', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"]}',
    pipeline = chain([readString(input), filter.withParser({packValues: false, filter: /^(|a|c)$/})]),
    result = [];

  pipeline.on('data', chunk => result.push(chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      {name: 'startObject'},
      {name: 'startKey'},
      {name: 'stringChunk', value: 'a'},
      {name: 'endKey'},
      {name: 'keyValue', value: 'a'},
      {name: 'startNumber'},
      {name: 'numberChunk', value: '1'},
      {name: 'endNumber'},
      {name: 'startKey'},
      {name: 'stringChunk', value: 'c'},
      {name: 'endKey'},
      {name: 'keyValue', value: 'c'},
      {name: 'startArray'},
      {name: 'endArray'},
      {name: 'endObject'}
    ]);
    resolve();
  });
});

test.asPromise('filter: no streaming', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"]}',
    pipeline = chain([readString(input), filter.withParser({packValues: false, streamValues: false, filter: /^(a|c)$/})]),
    result = [];

  pipeline.on('data', chunk => result.push(chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      {name: 'startObject'},
      {name: 'keyValue', value: 'a'},
      {name: 'startNumber'},
      {name: 'numberChunk', value: '1'},
      {name: 'endNumber'},
      {name: 'keyValue', value: 'c'},
      {name: 'startArray'},
      {name: 'endArray'},
      {name: 'endObject'}
    ]);
    resolve();
  });
});

test.asPromise('filter: deep', (t, resolve, reject) => {
  const data = {a: {b: {c: 1}}, b: {b: {c: 2}}, c: {b: {c: 3}}},
    asm = assembler(),
    pipeline = chain([readString(JSON.stringify(data)), filter.withParser({streamValues: false, filter: /^(?:a|c)\.b\b/}), asm.tapChain]);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(asm.current, {a: {b: {c: 1}}, c: {b: {c: 3}}});
    resolve();
  });

  pipeline.resume();
});

test.asPromise('filter: array', (t, resolve, reject) => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    asm = assembler(),
    pipeline = chain([
      readString(JSON.stringify(data)),
      filter.withParser({
        filter: stack => stack.length == 1 && typeof stack[0] == 'number' && stack[0] % 2
      }),
      asm.tapChain
    ]);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(asm.current, [2, 4, 6, 8, 10]);
    resolve();
  });

  pipeline.resume();
});

test.asPromise('filter: array with skipped values', (t, resolve, reject) => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    asm = assembler(),
    pipeline = chain([
      readString(JSON.stringify(data)),
      filter.withParser({
        filter: stack => stack.length == 1 && typeof stack[0] == 'number' && stack[0] % 2,
        skippedArrayValue: [{name: 'nullValue', value: null}]
      }),
      asm.tapChain
    ]);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(asm.current, [null, 2, null, 4, null, 6, null, 8, null, 10]);
    resolve();
  });

  pipeline.resume();
});

test.asPromise('filter: bug46', (t, resolve, reject) => {
  const data = [
      {data: {a: 1, b: 2}, x: 1},
      {data: {a: 3, b: 4}, y: 2}
    ],
    asm = assembler(),
    pipeline = chain([readString(JSON.stringify(data)), filter.withParser({filter: /data/}), asm.tapChain]);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(asm.current, [{data: {a: 1, b: 2}}, {data: {a: 3, b: 4}}]);
    resolve();
  });

  pipeline.resume();
});
