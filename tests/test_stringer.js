'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const makeParser = require('../index');
const Stringer = require('../Stringer');

unit.add(module, [
  function test_stringer(t) {
    const async = t.startAsync('test_stringer');

    const parser = makeParser(),
      stringer = new Stringer(),
      pattern = {
        a: [[[]]],
        b: {a: 1},
        c: {a: 1, b: 2},
        d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
        e: 1,
        f: '',
        g: true,
        h: false,
        i: null,
        j: [],
        k: {}
      },
      string = JSON.stringify(pattern);
    let buffer = '';

    parser.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(parser);
  },
  function test_stringer_no_packing(t) {
    const async = t.startAsync('test_stringer');

    const parser = makeParser({packValues: false}),
      stringer = new Stringer(),
      pattern = {
        a: [[[]]],
        b: {a: 1},
        c: {a: 1, b: 2},
        d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
        e: 1,
        f: '',
        g: true,
        h: false,
        i: null,
        j: [],
        k: {}
      },
      string = JSON.stringify(pattern);
    let buffer = '';

    parser.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(parser);
  },
  function test_stringer_values(t) {
    const async = t.startAsync('test_stringer_values');

    const parser = makeParser(),
      stringer = new Stringer({useValues: true}),
      pattern = {
        a: [[[]]],
        b: {a: 1},
        c: {a: 1, b: 2},
        d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
        e: 1,
        f: '',
        g: true,
        h: false,
        i: null,
        j: [],
        k: {}
      },
      string = JSON.stringify(pattern);
    let buffer = '';

    parser.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(parser);
  },
  function test_stringer_json_stream_objects(t) {
    const async = t.startAsync('test_stringer_json_stream_objects');

    const parser = makeParser({jsonStreaming: true}),
      stringer = new Stringer(),
      pattern = {
        a: [[[]]],
        b: {a: 1},
        c: {a: 1, b: 2},
        d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
        e: 1,
        f: '',
        g: true,
        h: false,
        i: null,
        j: [],
        k: {}
      };
    let string = JSON.stringify(pattern),
      buffer = '';

    string += string;

    parser.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(parser);
  },
  function test_stringer_json_stream_primitives(t) {
    const async = t.startAsync('test_stringer_json_stream_primitives');

    const parser = makeParser({jsonStreaming: true}),
      stringer = new Stringer(),
      string = '1 2 "zzz" "z\'z\\"z" null true false 1[]null{}true';
    let buffer = '';

    parser.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(parser);
  },
  function test_stringer_strings_with_special_symbols(t) {
    const async = t.startAsync('test_stringer_strings_with_special_symbols');

    const parser = makeParser({jsonStreaming: true}),
      stringer = new Stringer(),
      object = {
        message: "Test\tmessage\nWith\bnew\fline\r\ntest\\..."
      },
      string = JSON.stringify(object);
    let buffer = '';

    parser.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(parser);
  }
]);
