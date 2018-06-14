'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const makeParser = require('../src/main');
const Stringer = require('../src/Stringer');

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
  function test_stringer_json_stream(t) {
    const async = t.startAsync('test_stringer_json_stream');

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
  }
]);
