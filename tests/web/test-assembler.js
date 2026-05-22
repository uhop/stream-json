import test from 'tape-six';

import Assembler from '../../src/assembler.js';
import FlexAssembler from '../../src/utils/flex-assembler.js';
import parser from '../../src/web/parser.js';

const readableFromArray = chunks => {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    }
  });
};

const driveParser = input => {
  const {readable, writable} = parser.asWebStream();
  readableFromArray([input]).pipeTo(writable);
  return readable;
};

test.asPromise('Assembler.connectTo (web): assembles a single value via a ReadableStream', async (t, resolve, reject) => {
  try {
    const pattern = {a: [1, 2, {b: true}], c: 'hi', d: null};
    const results = [];
    Assembler.connectTo(driveParser(JSON.stringify(pattern)), {onDone: a => results.push(a.current)});
    // Allow the async pump in connectTo to drain.
    await new Promise(r => setTimeout(r, 30));
    t.equal(results.length, 1, 'onDone fired once');
    t.deepEqual(results[0], pattern, 'assembled value matches input');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('Assembler.connectTo (web): assembles multiple values from JSON Streaming', async (t, resolve, reject) => {
  try {
    const {readable, writable} = parser.asWebStream({jsonStreaming: true});
    readableFromArray(['1 2 3 [4,5] {"x":6}']).pipeTo(writable);
    const results = [];
    Assembler.connectTo(readable, {onDone: a => results.push(a.current)});
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(results, [1, 2, 3, [4, 5], {x: 6}], 'each top-level value emitted to onDone');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('FlexAssembler.connectTo (web): assembles into custom container', async (t, resolve, reject) => {
  try {
    const results = [];
    FlexAssembler.connectTo(driveParser('{"a":{"b":1,"c":2}}'), {
      objectRules: [
        {
          filter: 'a',
          create: () => new Map(),
          add: (container, key, value) => container.set(key, value)
        }
      ],
      onDone: a => results.push(a.current)
    });
    await new Promise(r => setTimeout(r, 30));
    t.equal(results.length, 1, 'onDone fired once');
    t.ok(results[0].a instanceof Map, '.a is a Map per the rule');
    t.equal(results[0].a.get('b'), 1, 'Map preserves key/value');
    t.equal(results[0].a.get('c'), 2, 'Map preserves second key/value');
    resolve();
  } catch (e) {
    reject(e);
  }
});
