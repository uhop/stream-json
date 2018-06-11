'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const StreamObject = require('../utils/StreamObject');

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
  }
]);
