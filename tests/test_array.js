'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const StreamArray = require('../streamers/StreamArray');

unit.add(module, [
  function test_array(t) {
    const async = t.startAsync('test_array');

    const stream = StreamArray.withParser(),
      pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']],
      result = [];

    stream.output.on('data', object => (result[object.key] = object.value));
    stream.output.on('end', () => {
      eval(t.TEST('t.unify(pattern, result)'));
      async.done();
    });

    new ReadString(JSON.stringify(pattern)).pipe(stream.input);
  },
  function test_array_fail(t) {
    const async = t.startAsync('test_array_fail');

    const stream = StreamArray.withParser();

    stream.on('data', value => eval(t.TEST("!'We shouldn't be here.'")));
    stream.on('error', e => {
      eval(t.TEST('e'));
      async.done();
    });
    stream.on('end', value => {
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    new ReadString(' true ').pipe(stream);
  },
  function test_array_filter(t) {
    const async = t.startAsync('test_array_filter');

    const f = assembler => {
      if (assembler.depth == 2 && assembler.key === null) {
        if (assembler.current instanceof Array) {
          return false; // reject
        }
        switch (assembler.current.a) {
          case 'accept':
            return true; // accept
          case 'reject':
            return false; // reject
        }
      }
      // undecided
    };

    const stream = StreamArray.withParser({objectFilter: f}),
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
          eval(t.TEST("o.a === 'accept'"));
        } else {
          eval(t.TEST('false')); // shouldn't be here
        }
      });
      async.done();
    });

    new ReadString(JSON.stringify(input)).pipe(stream.input);
  },
  function test_array_filter_include(t) {
    const async = t.startAsync('test_array_filter_include');

    const f = assembler => {
      if (assembler.depth == 2 && assembler.key === null) {
        if (assembler.current instanceof Array) {
          return false; // reject
        }
        switch (assembler.current.a) {
          case 'accept':
            return true; // accept
          case 'reject':
            return false; // reject
        }
      }
      // undecided
    };

    const stream = StreamArray.withParser({objectFilter: f, includeUndecided: true}),
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
