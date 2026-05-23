// Mirror of tests/node/test-filter.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions (chain from stream-chain/web, readWebString,
// drain — identical pipeline construction modulo source paths).

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import filter from '../../src/web/filters/filter.js';
import {assembler} from '../../src/web/assembler.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('filter (web)', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const pipeline = chain([readWebString(input), filter.withParser({packValues: false, filter: /^(|a|c)$/})]);
    const result = await drain(pipeline);
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
  } catch (e) {
    reject(e);
  }
});

test.asPromise('filter (web): no streaming', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const pipeline = chain([readWebString(input), filter.withParser({packValues: false, streamValues: false, filter: /^(a|c)$/})]);
    const result = await drain(pipeline);
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
  } catch (e) {
    reject(e);
  }
});

test.asPromise('filter (web): deep', async (t, resolve, reject) => {
  try {
    const data = {a: {b: {c: 1}}, b: {b: {c: 2}}, c: {b: {c: 3}}};
    const asm = assembler();
    const pipeline = chain([readWebString(JSON.stringify(data)), filter.withParser({streamValues: false, filter: /^(?:a|c)\.b\b/}), asm.tapChain]);
    await drain(pipeline);
    t.deepEqual(asm.current, {a: {b: {c: 1}}, c: {b: {c: 3}}});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('filter (web): array', async (t, resolve, reject) => {
  try {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const asm = assembler();
    const pipeline = chain([
      readWebString(JSON.stringify(data)),
      filter.withParser({
        filter: stack => stack.length == 1 && typeof stack[0] == 'number' && stack[0] % 2
      }),
      asm.tapChain
    ]);
    await drain(pipeline);
    t.deepEqual(asm.current, [2, 4, 6, 8, 10]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('filter (web): array with skipped values', async (t, resolve, reject) => {
  try {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const asm = assembler();
    const pipeline = chain([
      readWebString(JSON.stringify(data)),
      filter.withParser({
        filter: stack => stack.length == 1 && typeof stack[0] == 'number' && stack[0] % 2,
        skippedArrayValue: [{name: 'nullValue', value: null}]
      }),
      asm.tapChain
    ]);
    await drain(pipeline);
    t.deepEqual(asm.current, [null, 2, null, 4, null, 6, null, 8, null, 10]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('filter (web): accept objects', async (t, resolve, reject) => {
  try {
    const data = {a: 1, b: true, c: ['d']};
    const asm = assembler();
    const pipeline = chain([readWebString(JSON.stringify(data)), filter.withParser({acceptObjects: true, filter: /^(a|c)$/}), asm.tapChain]);
    await drain(pipeline);
    t.deepEqual(asm.current, {a: 1, c: ['d']});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('filter (web): bug46', async (t, resolve, reject) => {
  try {
    const data = [
      {data: {a: 1, b: 2}, x: 1},
      {data: {a: 3, b: 4}, y: 2}
    ];
    const asm = assembler();
    const pipeline = chain([readWebString(JSON.stringify(data)), filter.withParser({filter: /data/}), asm.tapChain]);
    await drain(pipeline);
    t.deepEqual(asm.current, [{data: {a: 1, b: 2}}, {data: {a: 3, b: 4}}]);
    resolve();
  } catch (e) {
    reject(e);
  }
});
