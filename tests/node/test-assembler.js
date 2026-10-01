import fs from 'node:fs';
import zlib from 'node:zlib';

import test from 'tape-six';
import chain from 'stream-chain';

import parserStream, {parser} from '../../src/index.js';
import Assembler, {assembler} from '../../src/assembler.js';
import {ExactNumber} from '../../src/utils/ext-numbers.js';

import {readString} from '../helpers.js';

test.asPromise('assembler: general', (t, resolve, reject) => {
  let object = null;
  const parser = parserStream(),
    asm = Assembler.connectTo(parser);

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('../data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);
    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString());

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(parser);
    });
  });
});

test.asPromise('assembler: no streaming', (t, resolve, reject) => {
  let object = null;
  const parser = parserStream({streamValues: false}),
    asm = Assembler.connectTo(parser);

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('../data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);

    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString());

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(parser);
    });
  });
});

test.asPromise('assembler: json stream primitives', (t, resolve, reject) => {
  const parser = parserStream({jsonStreaming: true}),
    pattern = [1, 2, 'zzz', 'z\'z"z', null, true, false, 1, [], null, {}, true, {a: 'b'}],
    result = [],
    asm = Assembler.connectTo(parser, {onDone: asm => result.push(asm.current)});
  parser.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });
  parser.on('error', reject);

  readString(pattern.map(value => JSON.stringify(value)).join(' ')).pipe(parser);
});

test.asPromise('assembler: reviver', (t, resolve, reject) => {
  const reviver = (k, v) => {
    if (k === 'b' || k === '1') return;
    return v;
  };

  const source = [
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3}
    ],
    json = JSON.stringify(source),
    shouldBe = JSON.parse(json, reviver);

  const parser = parserStream({streamValues: false}),
    asm = Assembler.connectTo(parser, {reviver});

  parser.on('end', () => {
    t.deepEqual(asm.current, shouldBe);
    resolve();
  });
  parser.on('error', reject);

  readString(json).pipe(parser);
});

test.asPromise('assembler: no streaming with reviver', (t, resolve, reject) => {
  const reviver = (k, v) => {
    if (k.charAt(0) === '@' || /^data/.test(k)) return;
    return v;
  };

  let object = null;
  const parser = parserStream({streamValues: false}),
    asm = Assembler.connectTo(parser, {reviver});

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('../data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);

    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString(), reviver);

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(parser);
    });
  });
});

test.asPromise('assembler: reviver this binding', (t, resolve, reject) => {
  const calls = [];
  const reviver = function (k, v) {
    calls.push({key: k, self: this, value: v});
    return v;
  };

  const json = '{"a": 1, "b": [2, 3]}';

  const p = parserStream({streamValues: false}),
    asm = Assembler.connectTo(p, {reviver});

  p.on('end', () => {
    const propA = calls.find(c => c.key === 'a');
    t.ok(propA.self === asm.current, 'this for object property is the containing object');

    const elem0 = calls.find(c => c.key === '0');
    t.ok(Array.isArray(elem0.self), 'this for array element is the array');

    const rootCall = calls.find(c => c.key === '');
    t.ok(rootCall, 'root call with key "" is made for objects');
    t.ok('' in rootCall.self, 'root this has empty-string key');
    t.deepEqual(rootCall.value, asm.current, 'root call value is the assembled object');

    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('assembler: reviver root call for array', (t, resolve, reject) => {
  const calls = [];
  const reviver = function (k, v) {
    calls.push({key: k, self: this, value: v});
    return v;
  };

  const json = '[1, 2, 3]';

  const p = parserStream({streamValues: false}),
    asm = Assembler.connectTo(p, {reviver});

  p.on('end', () => {
    const rootCall = calls.find(c => c.key === '');
    t.ok(rootCall, 'root call with key "" is made for arrays');
    t.ok(Array.isArray(rootCall.value), 'root call value is the assembled array');
    t.deepEqual(rootCall.value, [1, 2, 3]);

    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('assembler: reviver root call can transform value', (t, resolve, reject) => {
  const reviver = function (k, v) {
    if (k === '') return {wrapped: v};
    return v;
  };

  const json = '[1, 2, 3]';

  const p = parserStream({streamValues: false}),
    asm = Assembler.connectTo(p, {reviver});

  p.on('end', () => {
    t.deepEqual(asm.current, {wrapped: [1, 2, 3]});
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('assembler: reviver this binding for root primitive', (t, resolve, reject) => {
  let rootThis = null;
  const reviver = function (k, v) {
    rootThis = this;
    return v;
  };

  const json = '42';

  const p = parserStream({streamValues: false, jsonStreaming: true}),
    asm = Assembler.connectTo(p, {
      reviver,
      onDone: () => {
        t.equal(asm.current, 42);
        t.ok('' in rootThis, 'root this has empty-string key');
        t.equal(rootThis[''], 42, 'root this[""] is the value');
        resolve();
      }
    });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('assembler: numberAsString', (t, resolve, reject) => {
  const source = [
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3}
    ],
    json = JSON.stringify(source),
    shouldBe = [
      {a: '1', b: '2', c: '3'},
      {a: '1', b: '2', c: '3'},
      {a: '1', b: '2', c: '3'}
    ];

  const parser = parserStream({streamValues: false}),
    asm = Assembler.connectTo(parser, {numberAsString: true});

  parser.on('end', () => {
    t.deepEqual(asm.current, shouldBe);
    resolve();
  });
  parser.on('error', reject);

  readString(json).pipe(parser);
});

test.asPromise('assembler: chain', (t, resolve, reject) => {
  let object = null;
  const asm = assembler();

  const fileName = new URL('../data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);
    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString());

      const pipeline = chain([fs.createReadStream(fileName), zlib.createGunzip(), parser(), asm.tapChain]);
      pipeline.on('error', reject);
      pipeline.on('end', () => {
        t.deepEqual(asm.current, object);
        resolve();
      });
      pipeline.on('data', value => {
        t.deepEqual(value, object);
      });
    });
  });
});

const PROTO_VECTORS = [
  '{"__proto__":{"isAdmin":true},"name":"bob"}',
  '{"__proto__":null,"name":"bob"}',
  '{"__proto__":{"hasOwnProperty":1},"name":"bob"}',
  '{"user":{"__proto__":{"isAdmin":true},"name":"alice"}}'
];

const checkProtoParity = (t, actual, expected) => {
  const inner = actual.user || actual,
    innerExpected = expected.user || expected;
  t.deepEqual(actual, expected);
  t.deepEqual(Object.keys(inner), Object.keys(innerExpected), 'same own keys as JSON.parse');
  t.ok(Object.hasOwn(inner, '__proto__'), '__proto__ is an own property');
  t.equal(Object.getPrototypeOf(inner), Object.prototype, 'prototype untouched');
  t.equal(inner.isAdmin, undefined, 'nothing inherited');
  t.equal(typeof inner.hasOwnProperty, 'function', 'Object.prototype methods intact');
};

const assembleProto = (text, options) =>
  new Promise((resolve, reject) => {
    const asm = assembler(options),
      pipeline = chain([readString(text), parser(), asm.tapChain]);
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(asm.current));
    pipeline.resume();
  });

test.asPromise('assembler: __proto__ key becomes an own property, like JSON.parse', async (t, resolve, reject) => {
  try {
    for (const text of PROTO_VECTORS) {
      checkProtoParity(t, await assembleProto(text), JSON.parse(text));
      checkProtoParity(t, await assembleProto(text, {reviver: (_key, value) => value}), JSON.parse(text));
    }
    resolve();
  } catch (e) {
    reject(e);
  }
});

const assembleNumbers = (text, parserOptions, assemblerOptions, quant) =>
  new Promise((resolve, reject) => {
    const asm = assembler(assemblerOptions),
      pipeline = chain([readString(text, quant), parser(parserOptions), asm.tapChain]);
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(asm.current));
    pipeline.resume();
  });

test('assembler: numbers double is the default', async t => {
  const input = '[1, 1.5, 12345678901234567890, 0.1234567890123456789]';
  t.deepEqual(await assembleNumbers(input), JSON.parse(input));
  t.deepEqual(await assembleNumbers(input, undefined, {numbers: 'double'}), JSON.parse(input));
});

test('assembler: numbers bigint', async t => {
  const input = '[12345678901234567890, -12345678901234567890, 1e16, 100000000000000000.0, 1.5, 42, 1e2, 0.5e1, 1e-2]',
    result = await assembleNumbers(input, undefined, {numbers: 'bigint'});
  t.deepEqual(result, [12345678901234567890n, -12345678901234567890n, 10000000000000000n, 100000000000000000n, 1.5, 42, 100, 5, 0.01]);
});

test('assembler: numbers bigint switches over at the safe integer boundary', async t => {
  const input = '[9007199254740991, 9007199254740992, 9007199254740993, -9007199254740991, -9007199254740992, -9007199254740993]',
    result = await assembleNumbers(input, undefined, {numbers: 'bigint'});
  t.deepEqual(result, [9007199254740991, 9007199254740992n, 9007199254740993n, -9007199254740991, -9007199254740992n, -9007199254740993n]);
});

test('assembler: numbers exact', async t => {
  const result = await assembleNumbers('[42, 0.1234567890123456789, 123456789012345678901234567890, 1e2]', undefined, {numbers: 'exact'});
  t.ok(result.every(value => value instanceof ExactNumber));
  t.deepEqual(
    result.map(value => value.toString()),
    ['42', '0.1234567890123456789', '123456789012345678901234567890', '100']
  );
});

test('assembler: numbers in objects and at the top level', async t => {
  t.deepEqual(await assembleNumbers('{"a": 12345678901234567890, "b": [1, {"c": 18446744073709551616}]}', undefined, {numbers: 'bigint'}), {
    a: 12345678901234567890n,
    b: [1, {c: 18446744073709551616n}]
  });
  t.equal(await assembleNumbers('12345678901234567890', undefined, {numbers: 'bigint'}), 12345678901234567890n);
  t.equal((await assembleNumbers('0.1234567890123456789', undefined, {numbers: 'exact'})).toString(), '0.1234567890123456789');
});

test('assembler: numbers keep NaN, Infinity, and -Infinity as numbers', async t => {
  for (const numbers of ['double', 'bigint', 'exact']) {
    const result = await assembleNumbers('[NaN, Infinity, -Infinity]', {extendedNumbers: true}, {numbers});
    t.ok(Number.isNaN(result[0]), `${numbers}: NaN`);
    t.equal(result[1], Infinity, `${numbers}: Infinity`);
    t.equal(result[2], -Infinity, `${numbers}: -Infinity`);
  }
});

test('assembler: numbers work with a reviver and are overridden by numberAsString', async t => {
  const input = '[12345678901234567890, 5]';
  t.deepEqual(await assembleNumbers(input, undefined, {numbers: 'bigint', reviver: (key, value) => (typeof value == 'bigint' ? 'big' : value)}), ['big', 5]);
  t.deepEqual(await assembleNumbers(input, undefined, {numbers: 'bigint', numberAsString: true}), ['12345678901234567890', '5']);
});

test('assembler: numbers split across chunks', async t => {
  const input = '[12345678901234567890, 5, 1.5, 123456789012345678901234567890.5]',
    expected = await assembleNumbers(input, undefined, {numbers: 'exact'});
  for (let quant = 1; quant < 12; ++quant) {
    const result = await assembleNumbers(input, undefined, {numbers: 'exact'}, quant);
    t.deepEqual(
      result.map(value => value.toString()),
      expected.map(value => value.toString()),
      `chunks of ${quant}`
    );
  }
});
