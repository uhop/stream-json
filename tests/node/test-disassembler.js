import test from 'tape-six';
import chain from 'stream-chain';

import {parser} from '../../src/index.js';
import {assembler} from '../../src/assembler.js';
import disassembler from '../../src/disassembler.js';
import {ExactNumber} from '../../src/utils/ext-numbers.js';
import pick from '../../src/filters/pick.js';
import streamArray from '../../src/streamers/stream-array.js';
import streamValues from '../../src/streamers/stream-values.js';
import {stringer} from '../../src/stringer.js';

import {readString} from '../helpers.js';

const sanitize = x => {
  x = JSON.stringify(x);
  return typeof x == 'string' ? JSON.parse(x) : x;
};

const sanitizeWithReplacer = replacer => x => {
  x = JSON.stringify(x, replacer);
  return typeof x == 'string' ? JSON.parse(x) : x;
};

test.asPromise('disassembler: roundtrip', (t, resolve, reject) => {
  const input = [1, 2, null, true, false, {}, [], {a: {b: {c: [{d: 1}]}}}, [[[]]]],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), parser(), streamArray(), disassembler(), pick({filter: 'value'}), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, input);
    resolve();
  });
});

test.asPromise('disassembler: bad top-level values', (t, resolve, reject) => {
  const input = [1, () => {}, 2, undefined, 3, Symbol(), 4],
    result = [],
    pipeline = chain([disassembler(), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [1, 2, 3, 4]);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: bad values in object', (t, resolve, reject) => {
  const input = [{a: 1, b: () => {}, c: 2, d: undefined, e: 3, f: Symbol(), g: 4}],
    result = [],
    pipeline = chain([disassembler(), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [{a: 1, c: 2, e: 3, g: 4}]);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: bad values in array', (t, resolve, reject) => {
  const input = [[1, () => {}, 2, undefined, 3, Symbol(), 4]],
    result = [],
    pipeline = chain([disassembler(), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [[1, null, 2, null, 3, null, 4]]);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: dates', (t, resolve, reject) => {
  const date = new Date(),
    input = [1, date, 2],
    result = [],
    pipeline = chain([disassembler(), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [1, date.toJSON(''), 2]);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: chained toJSON', (t, resolve, reject) => {
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
    result = [],
    pipeline = chain([disassembler(), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, shouldBe);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: custom toJSON', (t, resolve, reject) => {
  const x = {
    a: 1,
    toJSON(k) {
      if (k !== '1' && k !== 'b') return 5;
    }
  };

  const input = [x, x, {a: x, b: x}, [x, x]],
    shouldBe = input.map(sanitize),
    result = [],
    pipeline = chain([disassembler(), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, shouldBe);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: custom toJSON filter top level', (t, resolve, reject) => {
  const x = {
    a: 1,
    toJSON(k) {
      if (k !== '') return 5;
    }
  };

  const input = [x, x, {a: x, b: x}, [x, x]],
    shouldBe = input.map(sanitize).filter(item => item !== undefined),
    result = [],
    pipeline = chain([disassembler(), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, shouldBe);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: custom replacer', (t, resolve, reject) => {
  const replacer = (k, v) => {
    if (k === '1' || k === 'b') return 5;
    if (k === '0' || k === 'c') return;
    return v;
  };

  const input = [1, 2, {a: 3, b: 4, c: 7}, [5, 6]],
    shouldBe = input.map(sanitizeWithReplacer(replacer)),
    result = [],
    pipeline = chain([disassembler({replacer}), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, shouldBe);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: custom replacer filter top level', (t, resolve, reject) => {
  const replacer = (k, v) => {
    if (k === '' && typeof v == 'number') return;
    if (k === '1' || k === 'b') return 5;
    if (k === '0' || k === 'c') return;
    return v;
  };

  const input = [1, 2, {a: 3, b: 4, c: 7}, [5, 6]],
    shouldBe = input.map(sanitizeWithReplacer(replacer)).filter(item => item !== undefined),
    result = [],
    pipeline = chain([disassembler({replacer}), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, shouldBe);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test.asPromise('disassembler: custom replacer array', (t, resolve, reject) => {
  const replacer = ['a', 'b'];

  const input = [1, 2, {a: 3, b: {a: 8, b: 9, c: 10}, c: 7}, [5, 6]],
    shouldBe = input.map(sanitizeWithReplacer(replacer)),
    result = [],
    pipeline = chain([disassembler({replacer}), streamValues()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, shouldBe);
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

test('disassembler: NaN streamValues=false yields only nullValue', t => {
  const fn = disassembler({streamValues: false});
  const tokens = [...fn(NaN)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('disassembler: NaN yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(NaN)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('disassembler: Infinity yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(Infinity)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('disassembler: -Infinity yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(-Infinity)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('disassembler: bigint yields number tokens with all digits', t => {
  const fn = disassembler();
  t.deepEqual(
    [...fn(12345678901234567890n)],
    [{name: 'startNumber'}, {name: 'numberChunk', value: '12345678901234567890'}, {name: 'endNumber'}, {name: 'numberValue', value: '12345678901234567890'}]
  );
});

test('disassembler: bigint streamValues=false yields only numberValue', t => {
  const fn = disassembler({streamValues: false});
  t.deepEqual([...fn(-5n)], [{name: 'numberValue', value: '-5'}]);
});

test('disassembler: bigint in containers', t => {
  const fn = disassembler({streamValues: false});
  t.deepEqual(
    [...fn({a: 1n, b: [2n]})],
    [
      {name: 'startObject'},
      {name: 'keyValue', value: 'a'},
      {name: 'numberValue', value: '1'},
      {name: 'keyValue', value: 'b'},
      {name: 'startArray'},
      {name: 'numberValue', value: '2'},
      {name: 'endArray'},
      {name: 'endObject'}
    ]
  );
});

test.asPromise('disassembler: bigint round trip through stringer', (t, resolve, reject) => {
  const input = [{a: 12345678901234567890n, b: [-1n, 9007199254740993n]}];
  let buffer = '';
  const pipeline = chain([disassembler(), stringer()]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, '{"a":12345678901234567890,"b":[-1,9007199254740993]}');
    resolve();
  });

  for (const item of input) {
    pipeline.write(item);
  }
  pipeline.end();
});

const numbersOf = (value, options) =>
  [...disassembler({streamValues: false, ...options})(value)]
    .filter(token => token.name === 'numberValue' || token.name === 'nullValue')
    .map(token => token.value);

test('disassembler: NaN and infinities become null by default', t => {
  t.deepEqual(numbersOf([NaN, Infinity, -Infinity]), [null, null, null]);
  t.deepEqual(numbersOf([NaN, Infinity], {extendedNumbers: false}), [null, null]);
});

test('disassembler: extendedNumbers writes NaN and infinities as numbers', t => {
  t.deepEqual(numbersOf([NaN, Infinity, -Infinity, 5], {extendedNumbers: true}), ['NaN', 'Infinity', '-Infinity', '5']);
  t.deepEqual(numbersOf({a: NaN, b: [-Infinity]}, {extendedNumbers: true}), ['NaN', '-Infinity']);
  t.deepEqual(
    [...disassembler({extendedNumbers: true})(-Infinity)],
    [{name: 'startNumber'}, {name: 'numberChunk', value: '-Infinity'}, {name: 'endNumber'}, {name: 'numberValue', value: '-Infinity'}]
  );
});

test('disassembler: extendedNumbers keeps bigint digits', t => {
  t.deepEqual(numbersOf([12345678901234567890n, NaN], {extendedNumbers: true}), ['12345678901234567890', 'NaN']);
});

test('disassembler: ExactNumber is written as canonical digits', t => {
  const exact = ['0.10', '1e2', '123456789012345678901234567890', '-0'].map(text => new ExactNumber(text));
  t.deepEqual(numbersOf(exact), ['0.1', '100', '123456789012345678901234567890', '0']);
  t.deepEqual(numbersOf({a: exact[0]}, {extendedNumbers: true}), ['0.1']);
});

test.asPromise('disassembler: extended numbers round trip through assembler and stringer', async (t, resolve, reject) => {
  try {
    const input = '[123456789012345678901234567890,0.1234567890123456789,NaN,Infinity,-Infinity]',
      asm = assembler({numbers: 'exact'}),
      parsed = chain([readString(input), parser({extendedNumbers: true}), asm.tapChain]);
    parsed.on('error', reject);
    parsed.resume();
    await new Promise(done => parsed.on('end', done));

    let text = '';
    const output = chain([disassembler({extendedNumbers: true}), stringer()]);
    output.on('data', data => (text += data));
    output.on('error', reject);
    output.on('end', () => {
      t.equal(text, input);
      resolve();
    });
    output.write(asm.current);
    output.end();
  } catch (error) {
    reject(error);
  }
});
