import fs from 'node:fs';
import zlib from 'node:zlib';

import test from 'tape-six';
import chain from 'stream-chain';

import makeParser, {parser} from '../src/index.js';
import Assembler, {assembler} from '../src/assembler.js';

import readString from './read-string.mjs';

test.asPromise('assembler: general', (t, resolve, reject) => {
  let object = null;
  const parser = makeParser(),
    asm = Assembler.connectTo(parser);

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

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
  const parser = makeParser({streamValues: false}),
    asm = Assembler.connectTo(parser);

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

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
  const parser = makeParser({jsonStreaming: true}),
    asm = Assembler.connectTo(parser),
    pattern = [1, 2, 'zzz', 'z\'z"z', null, true, false, 1, [], null, {}, true, {a: 'b'}],
    result = [];

  asm.on('done', asm => result.push(asm.current));
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

  const parser = makeParser({streamValues: false}),
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
  const parser = makeParser({streamValues: false}),
    asm = Assembler.connectTo(parser, {reviver});

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

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

  const p = makeParser({streamValues: false}),
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

  const p = makeParser({streamValues: false}),
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

  const p = makeParser({streamValues: false}),
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

  const p = makeParser({streamValues: false, jsonStreaming: true}),
    asm = Assembler.connectTo(p, {reviver});

  asm.on('done', () => {
    t.equal(asm.current, 42);
    t.ok('' in rootThis, 'root this has empty-string key');
    t.equal(rootThis[''], 42, 'root this[""] is the value');
    resolve();
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

  const parser = makeParser({streamValues: false}),
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

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

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
