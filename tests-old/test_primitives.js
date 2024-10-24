'use strict';

const unit = require('heya-unit');

const Assembler = require('../Assembler');
const Parser = require('../Parser');
const ReadString = require('./ReadString');

const survivesRoundtrip = (t, object) => {
  const async = t.startAsync('survivesRoundtrip: ' + object);

  const input = JSON.stringify(object),
    pipeline = new ReadString(input).pipe(new Parser()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('end', () => {
    eval(t.TEST('t.unify(assembler.current, object)'));
    async.done();
  });
};

unit.add(module, [
  function test_primitives_true(t) {
    survivesRoundtrip(t, true);
  },
  function test_primitives_false(t) {
    survivesRoundtrip(t, false);
  },
  function test_primitives_null(t) {
    survivesRoundtrip(t, null);
  },
  function test_primitives_number1(t) {
    survivesRoundtrip(t, 0);
  },
  function test_primitives_number2(t) {
    survivesRoundtrip(t, -1);
  },
  function test_primitives_number3(t) {
    survivesRoundtrip(t, 1.5);
  },
  function test_primitives_number4(t) {
    survivesRoundtrip(t, 1.5e-12);
  },
  function test_primitives_number5(t) {
    survivesRoundtrip(t, 1.5e33);
  },
  function test_primitives_string(t) {
    survivesRoundtrip(t, 'string');
  },
  function test_primitives_empty_object(t) {
    survivesRoundtrip(t, {});
  },
  function test_primitives_empty_array(t) {
    survivesRoundtrip(t, []);
  }
]);
