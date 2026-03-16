import test from 'tape-six';
import chain from 'stream-chain';

import {parser} from '../src/index.js';
import disassembler from '../src/disassembler.js';
import pick from '../src/filters/pick.js';
import streamArray from '../src/streamers/stream-array.js';
import streamValues from '../src/streamers/stream-values.js';

import readString from './read-string.mjs';

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
