'use strict';

const unit = require('heya-unit');

const Assembler = require('../Assembler');
const Parser = require('../Parser');
const ReadString = require('./ReadString');

unit.add(module, [
  function test_escaped(t) {
    const async = t.startAsync('test_escaped');

    const object = {
        stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
        anArray: [1, 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false]
      },
      input = JSON.stringify(object),
      pipeline = new ReadString(input).pipe(new Parser()),
      assembler = Assembler.connectTo(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(assembler.current, object)'));
      async.done();
    });
  }
]);
