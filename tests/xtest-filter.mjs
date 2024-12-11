'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import filter from '../src/filters/filter.js';

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

/*
unit.add(module, [
  function test_filter_no_streaming(t) {
    const async = t.startAsync('test_filter_no_streaming');

    const input = '{"a": 1, "b": true, "c": ["d"]}',
      pipeline = chain([
        readString(input),
        parser({packKeys: true, packValues: false, streamValues: false}),
        filter({filter: /^(|a|c)$/, streamValues: false})
      ]),
      result = [];

    pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
    pipeline.on('end', () => {
      eval(t.ASSERT('result.length === 9'));
      eval(t.TEST("result[0].name === 'startObject'"));
      eval(t.TEST("result[1].name === 'keyValue' && result[1].val === 'a'"));
      eval(t.TEST("result[2].name === 'startNumber'"));
      eval(t.TEST("result[3].name === 'numberChunk' && result[3].val === '1'"));
      eval(t.TEST("result[4].name === 'endNumber'"));
      eval(t.TEST("result[5].name === 'keyValue' && result[5].val === 'c'"));
      eval(t.TEST("result[6].name === 'startArray'"));
      eval(t.TEST("result[7].name === 'endArray'"));
      eval(t.TEST("result[8].name === 'endObject'"));
      async.done();
    });
  },
  function test_filter_deep(t) {
    const async = t.startAsync('test_filter_deep');

    const data = {a: {b: {c: 1}}, b: {b: {c: 2}}, c: {b: {c: 3}}};

    const pipeline = chain([readString(JSON.stringify(data)), parser({streamValues: false}), filter({filter: /^(?:a|c)\.b\b/})]);

    const asm = Assembler.connectTo(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(asm.current, {a: {b: {c: 1}}, c: {b: {c: 3}}})'));
      async.done();
    });
  },
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
