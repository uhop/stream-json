// Mirror of tests/node/test-flex-assembler.js. See tests/web/test-stringer.js
// for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import {parser} from '../../src/web/parser.js';
import FlexAssembler, {flexAssembler} from '../../src/web/utils/flex-assembler.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('flexAssembler (web): no rules matches Assembler', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: 1, b: [2, 3], c: {d: true, e: null}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, JSON.parse(json));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): object rule — Map', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: 1, b: {c: 2}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 1);
    t.ok(asm.current.get('b') instanceof Map);
    t.equal(asm.current.get('b').get('c'), 2);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): array rule — Set', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({tags: [1, 2, 2, 3]});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      arrayRules: [{filter: () => true, create: () => new Set(), add: (s, v) => s.add(v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current.tags instanceof Set);
    t.equal(asm.current.tags.size, 3);
    t.deepEqual([...asm.current.tags], [1, 2, 3]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): root-level custom object', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: 1, b: 2});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 1);
    t.equal(asm.current.get('b'), 2);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): root-level array as Set', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify([1, 2, 2, 3]);
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      arrayRules: [{filter: () => true, create: () => new Set(), add: (s, v) => s.add(v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current instanceof Set);
    t.deepEqual([...asm.current], [1, 2, 3]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): nested custom objects (Map containing Set)', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({items: [1, 2, 2], meta: {x: 10}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      arrayRules: [{filter: () => true, create: () => new Set(), add: (s, v) => s.add(v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current instanceof Map);
    t.ok(asm.current.get('items') instanceof Set);
    t.deepEqual([...asm.current.get('items')], [1, 2]);
    t.ok(asm.current.get('meta') instanceof Map);
    t.equal(asm.current.get('meta').get('x'), 10);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): finalize callback', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({x: 1, y: 2});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [
        {
          filter: () => true,
          create: () => ({}),
          add: (o, k, v) => {
            o[k] = v;
          },
          finalize: o => Object.freeze(o)
        }
      ]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(Object.isFrozen(asm.current));
    t.equal(asm.current.x, 1);
    t.equal(asm.current.y, 2);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): reviver composes with custom containers', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: 1, b: 2});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      reviver: (_k, v) => (typeof v === 'number' ? v * 10 : v)
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 10);
    t.equal(asm.current.get('b'), 20);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): reviver undefined skips add', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: 1, b: 2, c: 3});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      reviver: (k, v) => (k === 'b' ? undefined : v)
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 1);
    t.ok(!asm.current.has('b'));
    t.equal(asm.current.get('c'), 3);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): string filter', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({data: {x: 1, y: 2}, other: {z: 3}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: 'data', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.equal(typeof asm.current, 'object');
    t.ok(!(asm.current instanceof Map));
    t.ok(asm.current.data instanceof Map);
    t.equal(asm.current.data.get('x'), 1);
    t.deepEqual(asm.current.other, {z: 3});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): RegExp filter', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({items: [{name: 'a'}, {name: 'b'}]});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: /^items\.\d+$/, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(!(asm.current instanceof Map));
    t.ok(Array.isArray(asm.current.items));
    t.ok(asm.current.items[0] instanceof Map);
    t.equal(asm.current.items[0].get('name'), 'a');
    t.ok(asm.current.items[1] instanceof Map);
    t.equal(asm.current.items[1].get('name'), 'b');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): function filter with path', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: {deep: 1}, b: {deep: 2}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: path => path.length === 1 && path[0] === 'a', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current.a instanceof Map);
    t.equal(asm.current.a.get('deep'), 1);
    t.ok(!(asm.current.b instanceof Map));
    t.deepEqual(asm.current.b, {deep: 2});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): pathSeparator option', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({data: {x: 1}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      pathSeparator: '/',
      objectRules: [{filter: 'data', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current.data instanceof Map);
    t.equal(asm.current.data.get('x'), 1);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): numberAsString option', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: 1, b: 2});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {numberAsString: true});
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, {a: '1', b: '2'});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): tapChain', async (t, resolve, reject) => {
  try {
    const asm = flexAssembler({
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

    const json = JSON.stringify({a: 1, b: 2});
    const pipeline = chain([readWebString(json), parser(), asm.tapChain]);
    const out = await drain(pipeline);
    t.ok(asm.done);
    t.equal(out.length, 1);
    t.ok(out[0] instanceof Map);
    t.equal(out[0].get('a'), 1);
    t.equal(out[0].get('b'), 2);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): connectTo fires onDone', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({x: 1});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = new FlexAssembler({
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      onDone: a => {
        t.ok(a.current instanceof Map);
        t.equal(a.current.get('x'), 1);
        resolve();
      }
    });

    asm.connectTo(pipeline.readable);
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): jsonStreaming with multiple values', async (t, resolve, reject) => {
  try {
    const results = [];
    const asm = flexAssembler({
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      onDone: a => results.push(a.current)
    });

    const json = '{"a":1} {"b":2} {"c":3}';
    const pipeline = chain([readWebString(json), parser({jsonStreaming: true, streamValues: false})]);
    asm.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.equal(results.length, 3);
    t.ok(results.every(r => r instanceof Map));
    t.equal(results[0].get('a'), 1);
    t.equal(results[1].get('b'), 2);
    t.equal(results[2].get('c'), 3);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): first matching rule wins', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({a: 1});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [
        {filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)},
        {
          filter: () => true,
          create: () => new Set(),
          add: (s, v) => s.add(v)
        }
      ]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current instanceof Map);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): depth and path', async (t, resolve, reject) => {
  try {
    const depths = [];
    const paths = [];
    const json = JSON.stringify({a: {b: 1}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = new FlexAssembler();

    const origKV = asm.keyValue.bind(asm);
    asm.keyValue = function (v) {
      origKV(v);
      depths.push(this.depth);
      paths.push(this.path);
    };

    asm.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.equal(depths[0], 1);
    t.deepEqual(paths[0], []);
    t.equal(depths[1], 2);
    t.deepEqual(paths[1], ['a']);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): reviver root call', async (t, resolve, reject) => {
  try {
    const calls = [];
    const reviver = function (k, v) {
      calls.push({key: k, value: v});
      return v;
    };

    const json = JSON.stringify({a: 1});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    FlexAssembler.connectTo(pipeline.readable, {reviver});
    await new Promise(r => setTimeout(r, 30));
    const rootCall = calls.find(c => c.key === '');
    t.ok(rootCall);
    t.deepEqual(rootCall.value, {a: 1});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('flexAssembler (web): string filter matches descendants', async (t, resolve, reject) => {
  try {
    const json = JSON.stringify({data: {inner: {x: 1}}});
    const pipeline = chain([readWebString(json), parser({streamValues: false})]);
    const asm = FlexAssembler.connectTo(pipeline.readable, {
      objectRules: [{filter: 'data', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });
    await new Promise(r => setTimeout(r, 30));
    t.ok(asm.current.data instanceof Map);
    t.ok(asm.current.data.get('inner') instanceof Map);
    t.equal(asm.current.data.get('inner').get('x'), 1);
    resolve();
  } catch (e) {
    reject(e);
  }
});
