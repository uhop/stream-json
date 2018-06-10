'use strict';

const unit = require('heya-unit');

const Assembler = require('../utils/Assembler');
const Combo = require('../Combo');
const ReadString = require('./ReadString');

unit.add(module, [
  function test_escaped(t) {
    const async = t.startAsync('test_escaped');

    const object = {
        stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
        anArray: [1, 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false]
      },
      input = JSON.stringify(object),
      pipeline = new ReadString(input).pipe(new Combo({packKeys: true, packStrings: true, packNumbers: true})),
      assembler = new Assembler();

    pipeline.on('data', chunk => assembler[chunk.name] && assembler[chunk.name](chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(assembler.current, object)'));
      async.done();
    });
  }
]);
