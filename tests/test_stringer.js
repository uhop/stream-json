'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const makeSource = require('../main');
const Stringer = require('../utils/Stringer');

unit.add(module, [
  function test_stringer(t) {
    const async = t.startAsync('test_stringer');

    const source = makeSource(),
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

    source.output.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(source.input);
  },
  function test_stringer_json_stream(t) {
    const async = t.startAsync('test_stringer_json_stream');

    const source = makeSource({jsonStreaming: true}),
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

    source.output.pipe(stringer);

    stringer.on('data', data => (buffer += data));
    stringer.on('end', () => {
      eval(t.TEST('string === buffer'));
      async.done();
    });

    new ReadString(string).pipe(source.input);
  }
]);
