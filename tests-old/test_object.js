'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const StreamObject = require('../streamers/StreamObject');

unit.add(module, [
  function test_object(t) {
    const async = t.startAsync('test_object');

    const stream = StreamObject.withParser(),
      pattern = {
        str: 'bar',
        baz: null,
        t: true,
        f: false,
        zero: 0,
        one: 1,
        obj: {},
        arr: [],
        deepObj: {a: 'b'},
        deepArr: ['c'],
        '': '' // tricky, yet legal
      },
      result = {};

    stream.output.on('data', data => (result[data.key] = data.value));
    stream.output.on('end', () => {
      eval(t.TEST('t.unify(pattern, result)'));
      async.done();
    });

    new ReadString(JSON.stringify(pattern)).pipe(stream.input);
  },
  function test_object_fail(t) {
    const async = t.startAsync('test_object_fail');

    const stream = StreamObject.withParser();

    stream.on('data', value => eval(t.TEST("!'We shouldn't be here.'")));
    stream.on('error', err => {
      eval(t.TEST('err'));
      async.done();
    });
    stream.on('end', value => {
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    new ReadString(' true ').pipe(stream);
  },
  function test_object_no_streaming(t) {
    const async = t.startAsync('test_object_no_streaming');

    const stream = StreamObject.withParser({streamValues: false}),
      pattern = {
        str: 'bar',
        baz: null,
        t: true,
        f: false,
        zero: 0,
        one: 1,
        obj: {},
        arr: [],
        deepObj: {a: 'b'},
        deepArr: ['c'],
        '': '' // tricky, yet legal
      },
      result = {};

    stream.output.on('data', data => (result[data.key] = data.value));
    stream.output.on('end', () => {
      eval(t.TEST('t.unify(pattern, result)'));
      async.done();
    });

    new ReadString(JSON.stringify(pattern)).pipe(stream.input);
  },
  function test_object_filter(t) {
    const async = t.startAsync('test_object_filter');

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

    const stream = StreamObject.withParser({objectFilter: f}),
      input = {
        a: 0,
        b: 1,
        c: true,
        d: false,
        e: null,
        f: {},
        g: [],
        h: {a: 'reject', b: [[[]]]},
        i: ['c'],
        j: {a: 'accept'},
        k: {a: 'neutral'},
        l: {x: true, a: 'reject'},
        m: {y: null, a: 'accept'},
        n: {z: 1234, a: 'neutral'},
        o: {w: '12', a: 'neutral'}
      },
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
  function test_object_filter_include(t) {
    const async = t.startAsync('test_object_filter_include');

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

    const stream = StreamObject.withParser({objectFilter: f, includeUndecided: true}),
      input = {
        a: 0,
        b: 1,
        c: true,
        d: false,
        e: null,
        f: {},
        g: [],
        h: {a: 'reject', b: [[[]]]},
        i: ['c'],
        j: {a: 'accept'},
        k: {a: 'neutral'},
        l: {x: true, a: 'reject'},
        m: {y: null, a: 'accept'},
        n: {z: 1234, a: 'neutral'},
        o: {w: '12', a: 'neutral'}
      },
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
