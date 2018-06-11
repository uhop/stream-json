'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const StreamFilteredArray = require('../utils/StreamFilteredArray');

unit.add(module, [
  function test_filtered_array_fail(t) {
    const async = t.startAsync('test_filtered_array_fail');

    const stream = StreamFilteredArray.withParser();

    stream.output.on('data', value => eval(t.TEST("!'We shouldn't be here.'")));
    stream.output.on('error', err => {
      eval(t.TEST('err'));
      async.done();
    });
    stream.output.on('end', value => {
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    new ReadString(' true ').pipe(stream.input);
  },
  function test_filtered_array(t) {
    const async = t.startAsync('test_filtered_array');

    const stream = StreamFilteredArray.withParser(),
      pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']],
      result = [];

    stream.output.on('data', object => (result[object.index] = object.value));
    stream.output.on('end', () => {
      eval(t.TEST('t.unify(pattern, result)'));
      async.done();
    });

    new ReadString(JSON.stringify(pattern)).pipe(stream.input);
  },
  function test_filtered_array_default(t) {
    const async = t.startAsync('test_filtered_array_default');

    const stream = StreamFilteredArray.withParser(),
      input = [
        0,
        1,
        true,
        false,
        null,
        {},
        [],
        {a: 'reject', b: [[[]]]},
        ['c'],
        {a: 'accept'},
        {a: 'neutral'},
        {x: true, a: 'reject'},
        {y: null, a: 'accept'},
        {z: 1234, a: 'neutral'},
        {w: '12', a: 'neutral'}
      ],
      result = [];

    stream.output.on('data', object => result.push(object.value));
    stream.output.on('end', () => {
      eval(t.TEST('t.unify(input, result)'));
      async.done();
    });

    new ReadString(JSON.stringify(input)).pipe(stream.input);
  },
  function test_filtered_array_filter(t) {
    const async = t.startAsync('test_filtered_array_filter');

    const f = assembler => {
      if (assembler.stack.length == 2 && assembler.key === null && assembler.current) {
        if (assembler.current instanceof Array) {
          return false;
        }
        switch (assembler.current.a) {
          case 'accept':
            return true;
          case 'reject':
            return false;
        }
      }
    };

    const stream = StreamFilteredArray.withParser({objectFilter: f}),
      input = [
        0,
        1,
        true,
        false,
        null,
        {},
        [],
        {a: 'reject', b: [[[]]]},
        ['c'],
        {a: 'accept'},
        {a: 'neutral'},
        {x: true, a: 'reject'},
        {y: null, a: 'accept'},
        {z: 1234, a: 'neutral'},
        {w: '12', a: 'neutral'}
      ],
      result = [];

    stream.output.on('data', object => result.push(object.value));
    stream.output.on('end', () => {
      result.forEach(o => {
        if (typeof o == 'object' && o) {
          eval(t.TEST('!(o instanceof Array)'));
          eval(t.TEST("o.a !== 'reject'"));
        } else {
          eval(t.TEST("o === null || typeof o != 'object'"));
        }
      });
      async.done();
    });

    new ReadString(JSON.stringify(input)).pipe(stream.input);
  }
]);
