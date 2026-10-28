import {pipeline} from 'node:stream/promises';

import test from 'tape-six';
import chain from 'stream-chain';

import pick from '../../src/filters/pick.js';
import Assembler from '../../src/assembler.js';
import streamValues from '../../src/streamers/stream-values.js';
import streamArray from '../../src/streamers/stream-array.js';
import streamObject from '../../src/streamers/stream-object.js';

import {readString, streamToArray} from '../helpers.js';

test.asPromise('parser: pick events', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({packValues: false, filter: stack => stack.length === 2})]);

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      'startObject',
      'endObject',
      'startArray',
      'endArray',
      'nullValue',
      'startNumber',
      'numberChunk',
      'endNumber',
      'startString',
      'stringChunk',
      'endString',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'trueValue',
      'endObject'
    ]);
    resolve();
  });
});

test.asPromise('parser: pick packed events', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: stack => stack.length === 2})]);

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      'startObject',
      'endObject',
      'startArray',
      'endArray',
      'nullValue',
      'startNumber',
      'numberChunk',
      'endNumber',
      'numberValue',
      'startString',
      'stringChunk',
      'endString',
      'stringValue',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'trueValue',
      'endObject'
    ]);
    resolve();
  });
});

test.asPromise('parser: pick packed events no streaming', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({streamValues: false, filter: stack => stack.length === 2})]);

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      'startObject',
      'endObject',
      'startArray',
      'endArray',
      'nullValue',
      'numberValue',
      'stringValue',
      'startObject',
      'keyValue',
      'trueValue',
      'endObject'
    ]);
    resolve();
  });
});

test.asPromise('parser: pick objects', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: stack => stack.length === 2}), streamValues()]),
    expected = [{}, [], null, 1, 'e'],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects string filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: '0.a'}), streamValues()]),
    expected = [{}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects regexp filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: /\b[1-5]\.[a-d]\b/}), streamValues()]),
    expected = [[], null, 1],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects empty filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: () => false}), streamValues()]),
    expected = [],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick objects once', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: /\b[1-5]\.[a-d]\b/, once: true}), streamValues()]),
    expected = [[]],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

// malformed past the match: the run resolves only when the parser never reaches the tail
const stopInput = '{"meta":{"x":1},"rows":[1,2,3,4,5,6,7,8,9,x}';

test.asPromise('parser: pick once stops the chain after its match', (t, resolve, reject) => {
  const pipeline = chain([readString(stopInput, 4), pick.withParser({filter: 'meta', once: true}), streamValues()]),
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [{x: 1}]);
    resolve();
  });
});

test('parser: pick once stops a stream/promises pipeline after its match', async t => {
  const result = [];
  await pipeline(readString(stopInput, 4), pick.withParserAsStream({filter: 'meta', once: true}), streamValues.asStream(), streamToArray(result));
  t.deepEqual(
    result.map(chunk => chunk.value),
    [{x: 1}]
  );
});

test.asPromise('parser: pick array', (t, resolve, reject) => {
  const input = {a: [1, 2, 3], b: {c: 4, d: 5}},
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: 'a'}), streamArray()]),
    expected = [1, 2, 3],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick object', (t, resolve, reject) => {
  const input = {a: [1, 2, 3], b: {c: 4, d: 5}},
    pipeline = chain([readString(JSON.stringify(input)), pick.withParser({filter: 'b'}), streamObject()]),
    expected = [4, 5],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pick with global RegExp flag', (t, resolve, reject) => {
  const data = {a: 1, b: 2, a2: 3},
    pipeline = chain([readString(JSON.stringify(data)), pick.withParser({filter: /^a/g, streamValues: false})]),
    results = [];
  Assembler.connectTo(pipeline, {onDone: asm => results.push(asm.current)});

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(results[0], 1);
    t.equal(results[1], 3);
    resolve();
  });
});

test.asPromise('parser: pick maxDepth throws on over-deep input', (t, resolve, reject) => {
  const depth = 50,
    input = '{"a":'.repeat(depth) + '1' + '}'.repeat(depth),
    pipeline = chain([readString(input), pick.withParser({filter: 'x', maxDepth: 10})]);

  pipeline.on('data', () => {});
  pipeline.on('error', err => {
    t.ok(err instanceof RangeError);
    resolve();
  });
  pipeline.on('end', () => reject(new Error('expected a RangeError, but the stream ended')));
});

test.asPromise('parser: pick maxDepth passes within the limit', (t, resolve, reject) => {
  const data = {a: 1, b: 2},
    pipeline = chain([readString(JSON.stringify(data)), pick.withParser({filter: 'a', maxDepth: 10})]),
    results = [];
  Assembler.connectTo(pipeline, {onDone: asm => results.push(asm.current)});

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(results, [1]);
    resolve();
  });
});

test.asPromise('parser: pick maxDepth defaults to a finite limit', (t, resolve, reject) => {
  const depth = 2000,
    input = '{"a":'.repeat(depth) + '1' + '}'.repeat(depth),
    pipeline = chain([readString(input), pick.withParser({filter: 'x'})]);

  pipeline.on('data', () => {});
  pipeline.on('error', err => {
    t.ok(err instanceof RangeError);
    resolve();
  });
  pipeline.on('end', () => reject(new Error('expected a RangeError from the default maxDepth, but the stream ended')));
});

test.asPromise('parser: pick maxDepth Infinity disables the limit', (t, resolve, reject) => {
  const depth = 2000,
    input = '{"a":'.repeat(depth) + '1' + '}'.repeat(depth),
    pipeline = chain([readString(input), pick.withParser({filter: 'x', maxDepth: Infinity})]),
    result = [];

  pipeline.on('data', chunk => result.push(chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result.length, 0);
    resolve();
  });
});
