'use strict';

const unit = require('heya-unit');
const {chain} = require('stream-chain');

const StreamArray = require('../streamers/StreamArray');
const {batch} = require('../utils/Batch');

const {readString} = require('./ReadString');

unit.add(module, [
  function test_batch(t) {
    const async = t.startAsync('test_batch');

    const pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']],
      result = [],
      pipeline = chain([readString(JSON.stringify(pattern)), StreamArray.withParser(), batch({batchSize: 2})]);

    pipeline.output.on('data', batch => {
      eval(t.TEST('batch.length == 2 || batch.length == 1'));
      batch.forEach(object => (result[object.key] = object.value));
    });
    pipeline.output.on('end', () => {
      eval(t.TEST('t.unify(pattern, result)'));
      async.done();
    });
  },
  function test_batch_fail(t) {
    const async = t.startAsync('test_batch_fail');

    const pipeline = chain([readString(' true '), StreamArray.withParser(), batch()]);

    pipeline.on('data', value => eval(t.TEST("!'We shouldn't be here.'")));
    pipeline.on('error', e => {
      eval(t.TEST('e'));
      async.done();
    });
    pipeline.on('end', value => {
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });
  },
  function test_batch_filter(t) {
    const async = t.startAsync('test_batch_filter');

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

    const input = [
        /*  0 */ 0,
        /*  1 */ 1,
        /*  2 */ true,
        /*  3 */ false,
        /*  4 */ null,
        /*  5 */ {},
        /*  - */ [],
        /*  - */ {a: 'reject', b: [[[]]]},
        /*  - */ ['c'],
        /*  6 */ {a: 'accept'}, // accepted
        /*  7 */ {a: 'neutral'},
        /*  - */ {x: true, a: 'reject'},
        /*  8 */ {y: null, a: 'accept'}, // accepted
        /*  9 */ {z: 1234, a: 'neutral'},
        /* 10 */ {w: '12', a: 'neutral'}
      ],
      result = [],
      keys = [],
      pipeline = chain([readString(JSON.stringify(input)), StreamArray.withParser({objectFilter: f}), batch({batchSize: 5})]);

    pipeline.output.on('data', batch => {
      eval(t.TEST('batch.length >= 1 || batch.length <= 5'));
      batch.forEach(object => {
        keys.push(object.key);
        result[object.key] = object.value;
      });
    });
    pipeline.output.on('end', () => {
      eval(t.TEST('t.unify(keys, [6, 8])'));
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
  },
  function test_batch_filter_include(t) {
    const async = t.startAsync('test_batch_filter_include');

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

    const input = [
        /*  0 */ 0,
        /*  1 */ 1,
        /*  2 */ true,
        /*  3 */ false,
        /*  4 */ null,
        /*  5 */ {},
        /*  - */ [],
        /*  - */ {a: 'reject', b: [[[]]]},
        /*  - */ ['c'],
        /*  6 */ {a: 'accept'}, // accepted
        /*  7 */ {a: 'neutral'},
        /*  - */ {x: true, a: 'reject'},
        /*  8 */ {y: null, a: 'accept'}, // accepted
        /*  9 */ {z: 1234, a: 'neutral'},
        /* 10 */ {w: '12', a: 'neutral'}
      ],
      result = [],
      keys = [],
      pipeline = chain([readString(JSON.stringify(input)), StreamArray.withParser({objectFilter: f, includeUndecided: true}), batch({batchSize: 5})]);

    pipeline.output.on('data', batch => {
      eval(t.TEST('batch.length >= 1 || batch.length <= 5'));
      batch.forEach(object => {
        keys.push(object.key);
        result[object.key] = object.value;
      });
    });
    pipeline.output.on('end', () => {
      eval(t.TEST('t.unify(keys, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])'));
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
  }
]);
