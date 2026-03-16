const {test} = require('tape-six');

test('cjs: require main entry point', t => {
  const makeParser = require('../src/index.js');
  t.equal(typeof makeParser, 'function');
  t.equal(typeof makeParser.parser, 'function');
});

test('cjs: require parser', t => {
  const parser = require('../src/parser.js');
  t.equal(typeof parser, 'function');
  t.equal(typeof parser.asStream, 'function');
});

test('cjs: require assembler', t => {
  const Assembler = require('../src/assembler.js');
  t.equal(typeof Assembler, 'function');
  t.equal(typeof Assembler.connectTo, 'function');
  const asm = new Assembler();
  t.equal(typeof asm.tapChain, 'function');
});

test('cjs: require disassembler', t => {
  const disassembler = require('../src/disassembler.js');
  t.equal(typeof disassembler, 'function');
  t.equal(typeof disassembler.asStream, 'function');
});

test('cjs: require stringer', t => {
  const stringer = require('../src/stringer.js');
  t.equal(typeof stringer, 'function');
  t.equal(typeof stringer.asStream, 'function');
});

test('cjs: require emitter', t => {
  const emitter = require('../src/emitter.js');
  t.equal(typeof emitter, 'function');
  t.equal(typeof emitter.asStream, 'function');
});

test('cjs: require filters', t => {
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
});

test('cjs: require streamers', t => {
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
});

test('cjs: require utilities', t => {
  const emit = require('../src/utils/emit.js');
  const withParser = require('../src/utils/with-parser.js');
  const batch = require('../src/utils/batch.js');
  const verifier = require('../src/utils/verifier.js');
  const Utf8Stream = require('../src/utils/utf8-stream.js');

  t.equal(typeof emit, 'function');
  t.equal(typeof withParser, 'function');
  t.equal(typeof batch, 'function');
  t.equal(typeof verifier, 'function');
  t.equal(typeof Utf8Stream, 'function');
});

test('cjs: require jsonl', t => {
  const jsonlParser = require('../src/jsonl/parser.js');
  const jsonlStringer = require('../src/jsonl/stringer.js');

  t.equal(typeof jsonlParser, 'function');
  t.equal(typeof jsonlStringer, 'function');

  t.equal(typeof jsonlParser.asStream, 'function');
  t.equal(typeof jsonlStringer.asStream, 'function');
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
