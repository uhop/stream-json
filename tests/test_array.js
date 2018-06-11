'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const StreamArray = require('../utils/StreamArray');

unit.add(module, [
  function test_array_fail(t) {
    const async = t.startAsync('test_array_fail');

    const stream = StreamArray.withParser();

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
  function test_array(t) {
    const async = t.startAsync('test_array');

    const stream = StreamArray.withParser(),
      pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']],
      result = [];

    stream.output.on('data', object => (result[object.index] = object.value));
    stream.output.on('end', () => {
      eval(t.TEST('t.unify(pattern, result)'));
      async.done();
    });

    new ReadString(JSON.stringify(pattern)).pipe(stream.input);
  }
]);
