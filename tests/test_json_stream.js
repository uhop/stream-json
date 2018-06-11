'use strict';

const unit = require('heya-unit');

const ReadString = require('./ReadString');
const StreamJsonObjects = require('../utils/StreamJsonObjects');

unit.add(module, [
  function test_json_objects(t) {
    const async = t.startAsync('test_json_objects');

    const stream = StreamJsonObjects.withParser(),
      pattern = [1, 2, 3, true, false, '', 'Abc', [], [1], [1, []], {}, {a: 1}, {b: {}, c: [{}]}],
      result = [];

    stream.output.on('data', data => (result[data.index] = data.value));
    stream.output.on('end', () => {
      eval(t.TEST('t.unify(pattern, result)'));
      async.done();
    });

    new ReadString(pattern.map(value => JSON.stringify(value)).join(' ')).pipe(stream.input);
  },
  function test_no_json_objects(t) {
    const async = t.startAsync('test_no_json_objects');

    const stream = StreamJsonObjects.withParser(),
      result = [];

    stream.output.on('data', data => (result[data.index] = data.value));
    stream.output.on('end', () => {
      eval(t.TEST('!result.length'));
      async.done();
    });

    new ReadString('').pipe(stream.input);
  }
]);
