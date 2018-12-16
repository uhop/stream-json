'use strict';

const unit = require('heya-unit');

const {chain} = require('stream-chain');

const {parser} = require('../Parser');
const {filter} = require('../filters/Filter');
const Assembler = require('../Assembler');

const {readString} = require('./ReadString');

unit.add(module, [
  function test_filter(t) {
    const async = t.startAsync('test_filter');

    const input = '{"a": 1, "b": true, "c": ["d"]}',
      pipeline = chain([readString(input), parser({packKeys: true, packValues: false}), filter({filter: /^(|a|c)$/})]),
      result = [];

    pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
    pipeline.on('end', () => {
      eval(t.ASSERT('result.length === 15'));
      eval(t.TEST("result[0].name === 'startObject'"));
      eval(t.TEST("result[1].name === 'startKey'"));
      eval(t.TEST("result[2].name === 'stringChunk' && result[2].val === 'a'"));
      eval(t.TEST("result[3].name === 'endKey'"));
      eval(t.TEST("result[4].name === 'keyValue' && result[4].val === 'a'"));
      eval(t.TEST("result[5].name === 'startNumber'"));
      eval(t.TEST("result[6].name === 'numberChunk' && result[6].val === '1'"));
      eval(t.TEST("result[7].name === 'endNumber'"));
      eval(t.TEST("result[8].name === 'startKey'"));
      eval(t.TEST("result[9].name === 'stringChunk' && result[9].val === 'c'"));
      eval(t.TEST("result[10].name === 'endKey'"));
      eval(t.TEST("result[11].name === 'keyValue' && result[11].val === 'c'"));
      eval(t.TEST("result[12].name === 'startArray'"));
      eval(t.TEST("result[13].name === 'endArray'"));
      eval(t.TEST("result[14].name === 'endObject'"));
      async.done();
    });
  },
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
