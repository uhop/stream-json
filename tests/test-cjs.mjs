import {createRequire} from 'node:module';

import test from 'tape-six';

const require = createRequire(import.meta.url);

test.asPromise('cjs: require main entry point', (t, resolve, reject) => {
  const makeParser = require('../src/index.js');
  t.equal(typeof makeParser, 'function');
  t.equal(typeof makeParser.parser, 'function');
  resolve();
});

test.asPromise('cjs: require parser', (t, resolve, reject) => {
  const parser = require('../src/parser.js');
  t.equal(typeof parser, 'function');
  t.equal(typeof parser.asStream, 'function');
  resolve();
});

test.asPromise('cjs: require assembler', (t, resolve, reject) => {
  const Assembler = require('../src/assembler.js');
  t.equal(typeof Assembler, 'function');
  t.equal(typeof Assembler.connectTo, 'function');
  const asm = new Assembler();
  t.equal(typeof asm.tapChain, 'function');
  resolve();
});

test.asPromise('cjs: require disassembler', (t, resolve, reject) => {
  const disassembler = require('../src/disassembler.js');
  t.equal(typeof disassembler, 'function');
  t.equal(typeof disassembler.asStream, 'function');
  resolve();
});

test.asPromise('cjs: require stringer', (t, resolve, reject) => {
  const Stringer = require('../src/stringer.js');
  t.equal(typeof Stringer, 'function');
  t.equal(typeof Stringer.make, 'function');
  resolve();
});

test.asPromise('cjs: require emitter', (t, resolve, reject) => {
  const Emitter = require('../src/emitter.js');
  t.equal(typeof Emitter, 'function');
  t.equal(typeof Emitter.make, 'function');
  resolve();
});

test.asPromise('cjs: require filters', (t, resolve, reject) => {
  const pick = require('../src/filters/pick.js');
  const replace = require('../src/filters/replace.js');
  const ignore = require('../src/filters/ignore.js');
  const filter = require('../src/filters/filter.js');

  t.equal(typeof pick, 'function');
  t.equal(typeof replace, 'function');
  t.equal(typeof ignore, 'function');
  t.equal(typeof filter, 'function');

  t.equal(typeof pick.withParser, 'function');
  t.equal(typeof replace.withParser, 'function');
  t.equal(typeof ignore.withParser, 'function');
  t.equal(typeof filter.withParser, 'function');
  resolve();
});

test.asPromise('cjs: require streamers', (t, resolve, reject) => {
  const streamArray = require('../src/streamers/stream-array.js');
  const streamObject = require('../src/streamers/stream-object.js');
  const streamValues = require('../src/streamers/stream-values.js');

  t.equal(typeof streamArray, 'function');
  t.equal(typeof streamObject, 'function');
  t.equal(typeof streamValues, 'function');

  t.equal(typeof streamArray.withParser, 'function');
  t.equal(typeof streamObject.withParser, 'function');
  t.equal(typeof streamValues.withParser, 'function');

  t.equal(typeof streamArray.withParserAsStream, 'function');
  t.equal(typeof streamObject.withParserAsStream, 'function');
  t.equal(typeof streamValues.withParserAsStream, 'function');
  resolve();
});

test.asPromise('cjs: require utilities', (t, resolve, reject) => {
  const emit = require('../src/utils/emit.js');
  const withParser = require('../src/utils/with-parser.js');
  const Batch = require('../src/utils/batch.js');
  const Verifier = require('../src/utils/verifier.js');
  const Utf8Stream = require('../src/utils/utf8-stream.js');

  t.equal(typeof emit, 'function');
  t.equal(typeof withParser, 'function');
  t.equal(typeof Batch, 'function');
  t.equal(typeof Verifier, 'function');
  t.equal(typeof Utf8Stream, 'function');
  resolve();
});

test.asPromise('cjs: require jsonl', (t, resolve, reject) => {
  const JsonlParser = require('../src/jsonl/parser.js');
  const JsonlStringer = require('../src/jsonl/stringer.js');

  t.equal(typeof JsonlParser, 'function');
  t.equal(typeof JsonlStringer, 'function');

  t.equal(typeof JsonlParser.make, 'function');
  t.equal(typeof JsonlStringer.make, 'function');
  resolve();
});

test.asPromise('cjs: full pipeline with require', (t, resolve, reject) => {
  const {Readable} = require('node:stream');
  const chain = require('stream-chain');
  const {parser} = require('../src/index.js');
  const streamArray = require('../src/streamers/stream-array.js');

  const result = [],
    pipeline = chain([Readable.from(['[1, 2, 3]']), parser(), streamArray()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [1, 2, 3]);
    resolve();
  });
});
