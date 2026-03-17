import test from 'tape-six';
import chain from 'stream-chain';

import makeParser, {parser} from '../src/index.js';
import FlexAssembler, {flexAssembler} from '../src/utils/flex-assembler.js';

import readString from './read-string.mjs';

test.asPromise('flexAssembler: no rules matches Assembler', (t, resolve, reject) => {
  const json = JSON.stringify({a: 1, b: [2, 3], c: {d: true, e: null}});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p);

  p.on('end', () => {
    t.deepEqual(asm.current, JSON.parse(json));
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: object rule — Map', (t, resolve, reject) => {
  const json = JSON.stringify({a: 1, b: {c: 2}});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

  p.on('end', () => {
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 1);
    t.ok(asm.current.get('b') instanceof Map);
    t.equal(asm.current.get('b').get('c'), 2);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: array rule — Set', (t, resolve, reject) => {
  const json = JSON.stringify({tags: [1, 2, 2, 3]});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      arrayRules: [{filter: () => true, create: () => new Set(), add: (s, v) => s.add(v)}]
    });

  p.on('end', () => {
    t.ok(asm.current.tags instanceof Set);
    t.equal(asm.current.tags.size, 3);
    t.deepEqual([...asm.current.tags], [1, 2, 3]);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: root-level custom object', (t, resolve, reject) => {
  const json = JSON.stringify({a: 1, b: 2});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

  p.on('end', () => {
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 1);
    t.equal(asm.current.get('b'), 2);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: root-level array as Set', (t, resolve, reject) => {
  const json = JSON.stringify([1, 2, 2, 3]);
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      arrayRules: [{filter: () => true, create: () => new Set(), add: (s, v) => s.add(v)}]
    });

  p.on('end', () => {
    t.ok(asm.current instanceof Set);
    t.deepEqual([...asm.current], [1, 2, 3]);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: nested custom objects (Map containing Set)', (t, resolve, reject) => {
  const json = JSON.stringify({items: [1, 2, 2], meta: {x: 10}});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      arrayRules: [{filter: () => true, create: () => new Set(), add: (s, v) => s.add(v)}]
    });

  p.on('end', () => {
    t.ok(asm.current instanceof Map);
    t.ok(asm.current.get('items') instanceof Set);
    t.deepEqual([...asm.current.get('items')], [1, 2]);
    t.ok(asm.current.get('meta') instanceof Map);
    t.equal(asm.current.get('meta').get('x'), 10);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: finalize callback', (t, resolve, reject) => {
  const json = JSON.stringify({x: 1, y: 2});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
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

  p.on('end', () => {
    t.ok(Object.isFrozen(asm.current));
    t.equal(asm.current.x, 1);
    t.equal(asm.current.y, 2);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: reviver composes with custom containers', (t, resolve, reject) => {
  const json = JSON.stringify({a: 1, b: 2});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      reviver: (k, v) => (typeof v === 'number' ? v * 10 : v)
    });

  p.on('end', () => {
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 10);
    t.equal(asm.current.get('b'), 20);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: reviver undefined skips add', (t, resolve, reject) => {
  const json = JSON.stringify({a: 1, b: 2, c: 3});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      reviver: (k, v) => (k === 'b' ? undefined : v)
    });

  p.on('end', () => {
    t.ok(asm.current instanceof Map);
    t.equal(asm.current.get('a'), 1);
    t.ok(!asm.current.has('b'));
    t.equal(asm.current.get('c'), 3);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: string filter', (t, resolve, reject) => {
  const json = JSON.stringify({data: {x: 1, y: 2}, other: {z: 3}});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: 'data', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

  p.on('end', () => {
    t.equal(typeof asm.current, 'object');
    t.ok(!(asm.current instanceof Map));
    t.ok(asm.current.data instanceof Map);
    t.equal(asm.current.data.get('x'), 1);
    t.deepEqual(asm.current.other, {z: 3});
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: RegExp filter', (t, resolve, reject) => {
  const json = JSON.stringify({items: [{name: 'a'}, {name: 'b'}]});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: /^items\.\d+$/, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

  p.on('end', () => {
    t.ok(!(asm.current instanceof Map));
    t.ok(Array.isArray(asm.current.items));
    t.ok(asm.current.items[0] instanceof Map);
    t.equal(asm.current.items[0].get('name'), 'a');
    t.ok(asm.current.items[1] instanceof Map);
    t.equal(asm.current.items[1].get('name'), 'b');
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: function filter with path', (t, resolve, reject) => {
  const json = JSON.stringify({a: {deep: 1}, b: {deep: 2}});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: path => path.length === 1 && path[0] === 'a', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

  p.on('end', () => {
    t.ok(asm.current.a instanceof Map);
    t.equal(asm.current.a.get('deep'), 1);
    t.ok(!(asm.current.b instanceof Map));
    t.deepEqual(asm.current.b, {deep: 2});
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: pathSeparator option', (t, resolve, reject) => {
  const json = JSON.stringify({data: {x: 1}});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      pathSeparator: '/',
      objectRules: [{filter: 'data', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

  p.on('end', () => {
    t.ok(asm.current.data instanceof Map);
    t.equal(asm.current.data.get('x'), 1);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: numberAsString option', (t, resolve, reject) => {
  const json = JSON.stringify({a: 1, b: 2});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {numberAsString: true});

  p.on('end', () => {
    t.deepEqual(asm.current, {a: '1', b: '2'});
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: tapChain', (t, resolve, reject) => {
  const asm = flexAssembler({
    objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
  });

  const json = JSON.stringify({a: 1, b: 2});
  const pipeline = chain([readString(json), parser(), asm.tapChain]);

  pipeline.on('error', reject);
  pipeline.on('data', value => {
    t.ok(value instanceof Map);
    t.equal(value.get('a'), 1);
    t.equal(value.get('b'), 2);
  });
  pipeline.on('end', () => {
    t.ok(asm.done);
    resolve();
  });
});

test.asPromise('flexAssembler: connectTo emits done', (t, resolve, reject) => {
  const json = JSON.stringify({x: 1});
  const p = makeParser({streamValues: false});
  const asm = new FlexAssembler({
    objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
  });

  asm.connectTo(p);
  asm.on('done', a => {
    t.ok(a.current instanceof Map);
    t.equal(a.current.get('x'), 1);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: jsonStreaming with multiple values', (t, resolve, reject) => {
  const asm = flexAssembler({
    objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
  });

  const results = [];
  asm.on('done', a => results.push(a.current));

  const json = '{"a":1} {"b":2} {"c":3}';
  const p = makeParser({jsonStreaming: true, streamValues: false});
  asm.connectTo(p);

  p.on('end', () => {
    t.equal(results.length, 3);
    t.ok(results.every(r => r instanceof Map));
    t.equal(results[0].get('a'), 1);
    t.equal(results[1].get('b'), 2);
    t.equal(results[2].get('c'), 3);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: first matching rule wins', (t, resolve, reject) => {
  const json = JSON.stringify({a: 1});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [
        {filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)},
        {
          filter: () => true,
          create: () => new Set(),
          add: (s, v) => s.add(v)
        }
      ]
    });

  p.on('end', () => {
    t.ok(asm.current instanceof Map);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: depth and path', (t, resolve, reject) => {
  const depths = [],
    paths = [];
  const json = JSON.stringify({a: {b: 1}});
  const p = makeParser({streamValues: false});
  const asm = new FlexAssembler();

  const origKV = asm.keyValue.bind(asm);
  asm.keyValue = function (v) {
    origKV(v);
    depths.push(this.depth);
    paths.push(this.path);
  };

  asm.connectTo(p);
  p.on('end', () => {
    t.equal(depths[0], 1);
    t.deepEqual(paths[0], []);
    t.equal(depths[1], 2);
    t.deepEqual(paths[1], ['a']);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: reviver root call', (t, resolve, reject) => {
  const calls = [];
  const reviver = function (k, v) {
    calls.push({key: k, value: v});
    return v;
  };

  const json = JSON.stringify({a: 1});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {reviver});

  p.on('end', () => {
    const rootCall = calls.find(c => c.key === '');
    t.ok(rootCall, 'root call with key "" is made');
    t.deepEqual(rootCall.value, {a: 1});
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});

test.asPromise('flexAssembler: string filter matches descendants', (t, resolve, reject) => {
  const json = JSON.stringify({data: {inner: {x: 1}}});
  const p = makeParser({streamValues: false}),
    asm = FlexAssembler.connectTo(p, {
      objectRules: [{filter: 'data', create: () => new Map(), add: (m, k, v) => m.set(k, v)}]
    });

  p.on('end', () => {
    t.ok(asm.current.data instanceof Map);
    t.ok(asm.current.data.get('inner') instanceof Map);
    t.equal(asm.current.data.get('inner').get('x'), 1);
    resolve();
  });
  p.on('error', reject);

  readString(json).pipe(p);
});
