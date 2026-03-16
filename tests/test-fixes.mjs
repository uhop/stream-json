'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import Assembler from '../src/assembler.js';
import disassembler from '../src/disassembler.js';
import Stringer from '../src/stringer.js';
import Verifier from '../src/utils/verifier.js';
import Batch from '../src/utils/batch.js';
import JsonlStringer from '../src/jsonl/stringer.js';
import pick from '../src/filters/pick.js';

import readString from './read-string.mjs';

// Fix #1: disassembler should yield only nullValue for NaN/Infinity (not number tokens too)

test('fix: disassembler NaN yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(NaN)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('fix: disassembler Infinity yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(Infinity)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('fix: disassembler -Infinity yields only nullValue', t => {
  const fn = disassembler();
  const tokens = [...fn(-Infinity)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

test('fix: disassembler NaN streamValues=false yields only nullValue', t => {
  const fn = disassembler({streamValues: false});
  const tokens = [...fn(NaN)];
  t.equal(tokens.length, 1);
  t.equal(tokens[0].name, 'nullValue');
  t.equal(tokens[0].value, null);
});

// Fix #2: parser jsonStreaming should close openNumber when values are adjacent without whitespace

test.asPromise('fix: parser jsonStreaming adjacent number then array', (t, resolve, reject) => {
  const input = '123[4]',
    pipeline = chain([readString(input), parser({jsonStreaming: true})]),
    assembler = Assembler.connectTo(pipeline),
    results = [];

  assembler.on('done', asm => results.push(asm.current));

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(results.length, 2);
    t.equal(results[0], 123);
    t.deepEqual(results[1], [4]);
    resolve();
  });
});

test.asPromise('fix: parser jsonStreaming adjacent number then object', (t, resolve, reject) => {
  const input = '42{"a":1}',
    pipeline = chain([readString(input), parser({jsonStreaming: true})]),
    assembler = Assembler.connectTo(pipeline),
    results = [];

  assembler.on('done', asm => results.push(asm.current));

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(results.length, 2);
    t.equal(results[0], 42);
    t.deepEqual(results[1], {a: 1});
    resolve();
  });
});

test.asPromise('fix: parser jsonStreaming adjacent number then string', (t, resolve, reject) => {
  const input = '99"hello"',
    pipeline = chain([readString(input), parser({jsonStreaming: true})]),
    assembler = Assembler.connectTo(pipeline),
    results = [];

  assembler.on('done', asm => results.push(asm.current));

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(results.length, 2);
    t.equal(results[0], 99);
    t.equal(results[1], 'hello');
    resolve();
  });
});

test.asPromise('fix: parser jsonStreaming adjacent number then true', (t, resolve, reject) => {
  const input = '7true',
    pipeline = chain([readString(input, 2), parser({jsonStreaming: true})]),
    assembler = Assembler.connectTo(pipeline),
    results = [];

  assembler.on('done', asm => results.push(asm.current));

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(results.length, 2);
    t.equal(results[0], 7);
    t.equal(results[1], true);
    resolve();
  });
});

test.asPromise('fix: parser jsonStreaming number tokens emitted for adjacent values', (t, resolve, reject) => {
  const input = '123[4]',
    pipeline = chain([readString(input), parser({jsonStreaming: true, streamValues: false})]),
    result = [];

  pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result[0].name, 'numberValue');
    t.equal(result[0].val, '123');
    t.equal(result[1].name, 'startArray');
    t.equal(result[2].name, 'numberValue');
    t.equal(result[2].val, '4');
    t.equal(result[3].name, 'endArray');
    resolve();
  });
});

// Fix #3: regExpFilter should handle global RegExp without alternating behavior

test.asPromise('fix: pick with global RegExp flag', (t, resolve, reject) => {
  const data = {a: 1, b: 2, a2: 3},
    pipeline = chain([readString(JSON.stringify(data)), pick.withParser({filter: /^a/g, streamValues: false})]),
    assembler = Assembler.connectTo(pipeline),
    results = [];

  assembler.on('done', asm => results.push(asm.current));

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(results[0], 1);
    t.equal(results[1], 3);
    resolve();
  });
});

// Fix #6: verifier should still work after noSticky removal

test.asPromise('fix: verifier validates correct JSON', (t, resolve, reject) => {
  const input = '{"a": [1, 2.5, true, false, null, "str"], "b": {}}',
    verifier = Verifier.make();

  verifier.on('error', reject);
  verifier.on('finish', resolve);

  readString(input, 3).pipe(verifier);
});

test.asPromise('fix: verifier rejects invalid JSON', (t, resolve, reject) => {
  const input = '{"a": [1, 2.5}',
    verifier = Verifier.make();

  verifier.on('error', resolve);
  verifier.on('finish', () => {
    t.fail('should have rejected');
    reject();
  });

  readString(input).pipe(verifier);
});

test.asPromise('fix: verifier with jsonStreaming', (t, resolve, reject) => {
  const input = '{"a":1} {"b":2} [3]',
    verifier = Verifier.make({jsonStreaming: true});

  verifier.on('error', reject);
  verifier.on('finish', resolve);

  readString(input, 2).pipe(verifier);
});

test.asPromise('fix: verifier with numbers', (t, resolve, reject) => {
  const input = '{"x": 1.5e10, "y": -3, "z": 0.123}',
    verifier = Verifier.make();

  verifier.on('error', reject);
  verifier.on('finish', resolve);

  readString(input, 3).pipe(verifier);
});

// Fix #7: stringer sanitizeString with Object.hasOwn

test.asPromise('fix: stringer handles control characters', (t, resolve, reject) => {
  const pipeline = chain([
    readString('{"a":"hello\\nworld\\t!\\u0000end"}'),
    parser(),
    Stringer.make({useValues: true})
  ]);
  let result = '';

  pipeline.on('data', chunk => (result += chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result, '{"a":"hello\\nworld\\t!\\u0000end"}');
    resolve();
  });
});

// Fix #8: JSONL stringer with custom separator

test.asPromise('fix: jsonl stringer with custom separator', (t, resolve, reject) => {
  const stringer = JsonlStringer.make({separator: '\r\n'});
  let result = '';

  stringer.on('data', chunk => (result += chunk));
  stringer.on('error', reject);
  stringer.on('end', () => {
    t.equal(result, '{"a":1}\r\n{"b":2}\r\n{"c":3}');
    resolve();
  });

  stringer.write({a: 1});
  stringer.write({b: 2});
  stringer.write({c: 3});
  stringer.end();
});

test.asPromise('fix: jsonl stringer default separator is newline', (t, resolve, reject) => {
  const stringer = JsonlStringer.make();
  let result = '';

  stringer.on('data', chunk => (result += chunk));
  stringer.on('error', reject);
  stringer.on('end', () => {
    t.equal(result, '1\n2\n3');
    resolve();
  });

  stringer.write(1);
  stringer.write(2);
  stringer.write(3);
  stringer.end();
});

// Fix #10: batch integer batchSize

test('fix: batch truncates fractional batchSize', t => {
  const batch = Batch.make({batchSize: 2.7});
  t.equal(batch._batchSize, 2);
});

test('fix: batch handles batchSize between 0 and 1', t => {
  const batch = Batch.make({batchSize: 0.5});
  t.equal(batch._batchSize, 1);
});
