'use strict';

const unit = require('heya-unit');

const Parser = require('../Parser');
const Filter = require('../utils/Filter');
const Assembler = require('../utils/Assembler');

const ReadString = require('./ReadString');

unit.add(module, [
  function test_filter(t) {
    const async = t.startAsync('test_filter');

    const input = '{"a": 1, "b": true, "c": ["d"]}',
      pipeline = new ReadString(input).pipe(new Parser()).pipe(new Filter({filter: /^(|a|c)$/})),
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
  function test_filter_deep(t) {
    const async = t.startAsync('test_filter_deep');

    const data = {a: {b: {c: 1}}, b: {b: {c: 2}}, c: {b: {c: 3}}};

    const pipeline = new ReadString(JSON.stringify(data))
      .pipe(new Parser({packValues: true}))
      .pipe(new Filter({filter: /^(?:a|c)\.b\b/}));

    const asm = Assembler.connect(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(asm.current, {a: {b: {c: 1}}, c: {b: {c: 3}}})'));
      async.done();
    });
  },
  function test_filter_array(t) {
    const async = t.startAsync('test_filter_array');

    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const pipeline = new ReadString(JSON.stringify(data)).pipe(new Parser({packValues: true})).pipe(
      new Filter({
        filter: stack => stack.length == 1 && typeof stack[0] == 'number' && stack[0] % 2
      })
    );

    const asm = Assembler.connect(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(asm.current, [null, 2, null, 4, null, 6, null, 8, null, 10])'));
      async.done();
    });
  },
  function test_filter_default_value(t) {
    const async = t.startAsync('test_filter_default_value');

    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const pipeline = new ReadString(JSON.stringify(data)).pipe(new Parser({packValues: true})).pipe(
      new Filter({
        defaultValue: [],
        filter: stack => stack.length == 1 && typeof stack[0] == 'number' && stack[0] % 2
      })
    );

    const asm = Assembler.connect(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(asm.current, [2, 4, 6, 8, 10])'));
      async.done();
    });
  }
]);
