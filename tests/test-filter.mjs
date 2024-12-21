'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import filter from '../src/filters/filter.js';
import {assembler} from '../src/assembler.js';

import readString from './read-string.mjs';

test.asPromise('filter', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"]}',
    pipeline = chain([readString(input), filter.withParser({packKeys: true, packValues: false, filter: /^(a|c)$/})]),
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
    pipeline = chain([readString(input), filter.withParser({packKeys: true, packValues: false, streamValues: false, filter: /^(a|c)$/})]),
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

/*
unit.add(module, [
  function test_filter_array(t) {
    const async = t.startAsync('test_filter_array');

    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const pipeline = chain([
      readString(JSON.stringify(data)),
      parser(),
      filter({
        filter: stack => stack.length == 1 && typeof stack[0] == 'number' && stack[0] % 2
      })
    ]);

    const asm = Assembler.connectTo(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(asm.current, [2, 4, 6, 8, 10])'));
      async.done();
    });
  },
  function test_filter_bug46(t) {
    const async = t.startAsync('test_filter_bug46');

    const data = [{data: {a: 1, b: 2}, x: 1}, {data: {a: 3, b: 4}, y: 2}];

    const pipeline = chain([readString(JSON.stringify(data)), parser(), filter({filter: /data/})]);

    const asm = Assembler.connectTo(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(asm.current, [{data: {a: 1, b: 2}}, {data: {a: 3, b: 4}}])'));
      async.done();
    });
  }
]);
*/
