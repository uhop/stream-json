// Mirror of tests/node/test-assembler.js, scoped to inline JSON (no fs/zlib).
// See tests/web/test-stringer.js for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import parserWebStream, {parser} from '../../src/web/index.js';
import Assembler, {assembler} from '../../src/web/assembler.js';

import {readWebString, drain} from '../web-helpers.js';

const sample = {
  a: [[[]]],
  b: {a: 1},
  c: {a: 1, b: 2},
  d: [true, 1, 'x', null, false, true, {}, [], ''],
  e: 1,
  f: '',
  g: true,
  h: false,
  i: null,
  j: [],
  k: {}
};

test.asPromise('assembler (web): general', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString(JSON.stringify(sample)), parser()]);
    const asm = Assembler.connectTo(pipeline.readable);
    // Allow the async pump in connectTo to drain.
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, sample);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): no streaming', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString(JSON.stringify(sample)), parser({streamValues: false})]);
    const asm = Assembler.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, sample);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): json stream primitives', async (t, resolve, reject) => {
  try {
    const pattern = [1, 2, 'zzz', 'z\'z"z', null, true, false, 1, [], null, {}, true, {a: 'b'}];
    const result = [];
    const pipeline = chain([readWebString(pattern.map(v => JSON.stringify(v)).join(' ')), parser({jsonStreaming: true})]);
    Assembler.connectTo(pipeline.readable, {onDone: asm => result.push(asm.current)});
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): reviver', async (t, resolve, reject) => {
  try {
    const reviver = (k, v) => {
      if (k === 'b' || k === '1') return;
      return v;
    };

    const source = [
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3}
    ];
    const json = JSON.stringify(source);
    const shouldBe = JSON.parse(json, reviver);

    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = Assembler.connectTo(pipeline.readable, {reviver});
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): reviver this binding', async (t, resolve, reject) => {
  try {
    const calls = [];
    const reviver = function (k, v) {
      calls.push({key: k, self: this, value: v});
      return v;
    };

    const json = '{"a": 1, "b": [2, 3]}';
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = Assembler.connectTo(pipeline.readable, {reviver});
    await new Promise(r => setTimeout(r, 30));

    const propA = calls.find(c => c.key === 'a');
    t.ok(propA.self === asm.current);

    const elem0 = calls.find(c => c.key === '0');
    t.ok(Array.isArray(elem0.self));

    const rootCall = calls.find(c => c.key === '');
    t.ok(rootCall);
    t.ok('' in rootCall.self);
    t.deepEqual(rootCall.value, asm.current);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): reviver root call for array', async (t, resolve, reject) => {
  try {
    const calls = [];
    const reviver = function (k, v) {
      calls.push({key: k, self: this, value: v});
      return v;
    };

    const json = '[1, 2, 3]';
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    Assembler.connectTo(pipeline.readable, {reviver});
    await new Promise(r => setTimeout(r, 30));

    const rootCall = calls.find(c => c.key === '');
    t.ok(rootCall);
    t.ok(Array.isArray(rootCall.value));
    t.deepEqual(rootCall.value, [1, 2, 3]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): reviver root call can transform value', async (t, resolve, reject) => {
  try {
    const reviver = function (k, v) {
      if (k === '') return {wrapped: v};
      return v;
    };

    const json = '[1, 2, 3]';
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = Assembler.connectTo(pipeline.readable, {reviver});
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, {wrapped: [1, 2, 3]});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): reviver this binding for root primitive', async (t, resolve, reject) => {
  try {
    let rootThis = null;
    const reviver = function (_k, v) {
      rootThis = this;
      return v;
    };

    const json = '42';
    const pipeline = chain([readWebString(json), parser({streamValues: false, jsonStreaming: true})]);
    const asm = Assembler.connectTo(pipeline.readable, {reviver});
    await new Promise(r => setTimeout(r, 30));
    t.equal(asm.current, 42);
    t.ok('' in rootThis);
    t.equal(rootThis[''], 42);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): numberAsString', async (t, resolve, reject) => {
  try {
    const source = [
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3}
    ];
    const json = JSON.stringify(source);
    const shouldBe = [
      {a: '1', b: '2', c: '3'},
      {a: '1', b: '2', c: '3'},
      {a: '1', b: '2', c: '3'}
    ];

    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = Assembler.connectTo(pipeline.readable, {numberAsString: true});
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, shouldBe);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('assembler (web): chain', async (t, resolve, reject) => {
  try {
    const asm = assembler();
    const pipeline = chain([readWebString(JSON.stringify(sample)), parser(), asm.tapChain]);
    const out = await drain(pipeline);
    t.deepEqual(asm.current, sample);
    t.equal(out.length, 1);
    t.deepEqual(out[0], sample);
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Smoke test that the default `stream-json/web` export resolves correctly.
test.asPromise('assembler (web): default export from stream-json/web', async (t, resolve, reject) => {
  try {
    const pair = parserWebStream();
    t.ok(pair.readable);
    t.ok(pair.writable);
    resolve();
  } catch (e) {
    reject(e);
  }
});
