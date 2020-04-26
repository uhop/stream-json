'use strict';

const unit = require('heya-unit');

const {chain} = require('stream-chain');

const ReadString = require('./ReadString');
const {parser} = require('../index');
const {pick} = require('../filters/Pick');
const {disassembler} = require('../Disassembler');
const {streamArray} = require('../streamers/StreamArray');
const {streamValues} = require('../streamers/StreamValues');

const sanitize = x => {
  x = JSON.stringify(x);
  return typeof x == 'string' ? JSON.parse(x) : x;
};

const sanitizeWithReplacer = replacer => x => {
  x = JSON.stringify(x, replacer);
  return typeof x == 'string' ? JSON.parse(x) : x;
};

unit.add(module, [
  function test_disassembler(t) {
    const async = t.startAsync('test_disassembler');

    const input = [1, 2, null, true, false, {}, [], {a: {b: {c: [{d: 1}]}}}, [[[]]]],
      result = [];

    const pipeline = chain([new ReadString(JSON.stringify(input)), parser(), streamArray(), disassembler(), pick({filter: 'value'}), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, input)'));
      async.done();
    });
  },
  function test_disassembler_bad_top_level(t) {
    const async = t.startAsync('test_disassembler_bad_top_level');

    const input = [1, () => {}, 2, undefined, 3, Symbol(), 4],
      result = [];

    const pipeline = chain([disassembler(), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, [1, 2, 3, 4])'));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_bad_values_in_object(t) {
    const async = t.startAsync('test_disassembler_bad_values_in_object');

    const input = [{a: 1, b: () => {}, c: 2, d: undefined, e: 3, f: Symbol(), g: 4}],
      result = [];

    const pipeline = chain([disassembler(), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, [{a: 1, c: 2, e: 3, g: 4}])'));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_bad_values_in_array(t) {
    const async = t.startAsync('test_disassembler_bad_values_in_array');

    const input = [[1, () => {}, 2, undefined, 3, Symbol(), 4]],
      result = [];

    const pipeline = chain([disassembler(), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, [[1, null, 2, null, 3, null, 4]])'));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_dates(t) {
    const async = t.startAsync('test_disassembler_dates');

    const date = new Date(),
      input = [1, date, 2],
      result = [];

    const pipeline = chain([disassembler(), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, [1, date.toJSON(""), 2])'));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_chained_toJSON(t) {
    const async = t.startAsync('test_disassembler_chained_toJSON');

    const x = {a: 1};

    const y = {
      b: 2,
      toJSON() {
        return x;
      }
    };

    const z = {
      c: 3,
      toJSON() {
        return y;
      }
    };

    const input = [x, y, z],
      shouldBe = input.map(sanitize),
      result = [];

    const pipeline = chain([disassembler(), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, shouldBe)'));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_custom_toJSON(t) {
    const async = t.startAsync('test_disassembler_custom_toJSON');

    const x = {
      a: 1,
      toJSON(k) {
        if (k !== '1' && k !== 'b') return 5;
        // otherwise skip by returning undefined
      }
    };

    const input = [x, x, {a: x, b: x}, [x, x]],
      shouldBe = input.map(sanitize),
      result = [];

    const pipeline = chain([disassembler(), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, shouldBe)'));
      async.done();
    });
    pipeline.on('error', error => {
      console.log(error);
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_custom_toJSON_filter_top_level(t) {
    const async = t.startAsync('test_disassembler_custom_toJSON_filter_top_level');

    const x = {
      a: 1,
      toJSON(k) {
        if (k !== '') return 5;
        // otherwise skip by returning undefined
      }
    };

    const input = [x, x, {a: x, b: x}, [x, x]],
      shouldBe = input.map(sanitize).filter(item => item !== undefined),
      result = [];

    const pipeline = chain([disassembler(), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, shouldBe)'));
      async.done();
    });
    pipeline.on('error', error => {
      console.log(error);
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_custom_replacer(t) {
    const async = t.startAsync('test_disassembler_custom_replacer');

    const replacer = (k, v) => {
      if (k === '1' || k === 'b') return 5;
      if (k === '0' || k === 'c') return;
      return v;
    };

    const input = [1, 2, {a: 3, b: 4, c: 7}, [5, 6]],
      shouldBe = input.map(sanitizeWithReplacer(replacer)),
      result = [];

    const pipeline = chain([disassembler({replacer}), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, shouldBe)'));
      async.done();
    });
    pipeline.on('error', error => {
      console.log(error);
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_custom_replacer_filter_top_level(t) {
    const async = t.startAsync('test_disassembler_custom_replacer_filter_top_level');

    const replacer = (k, v) => {
      if (k === '' && typeof v == 'number') return;
      if (k === '1' || k === 'b') return 5;
      if (k === '0' || k === 'c') return;
      return v;
    };

    const input = [1, 2, {a: 3, b: 4, c: 7}, [5, 6]],
      shouldBe = input.map(sanitizeWithReplacer(replacer)).filter(item => item !== undefined),
      result = [];

    const pipeline = chain([disassembler({replacer}), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, shouldBe)'));
      async.done();
    });
    pipeline.on('error', error => {
      console.log(error);
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  },
  function test_disassembler_custom_replacer_array(t) {
    const async = t.startAsync('test_disassembler_custom_replacer_array');

    const replacer = ['a', 'b'];

    const input = [1, 2, {a: 3, b: {a: 8, b: 9, c: 10}, c: 7}, [5, 6]],
      shouldBe = input.map(sanitizeWithReplacer(replacer)),
      result = [];

    const pipeline = chain([disassembler({replacer}), streamValues()]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, shouldBe)'));
      async.done();
    });
    pipeline.on('error', error => {
      console.log(error);
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    for (const item of input) {
      pipeline.write(item);
    }
    pipeline.end();
  }
]);
