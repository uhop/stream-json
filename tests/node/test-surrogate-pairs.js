import test from 'tape-six';
import {createReadStream, createWriteStream} from 'node:fs';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';

import {getManyValues, none} from 'stream-chain/core';
import pipe from 'stream-chain/utils/pipe.js';
import drain from 'stream-chain/utils/drain.js';

import {jsonParser} from '../../src/core/parser.js';
import {jsoncParser} from '../../src/core/jsonc/parser.js';
import parser from '../../src/parser.js';
import stringer from '../../src/stringer.js';
import jsoncParserFactory from '../../src/jsonc/parser.js';
import jsoncStringer from '../../src/jsonc/stringer.js';
import stringerToFile from '../../src/file/stringer.js';
import {disassembler} from '../../src/disassembler.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-surrogates-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

const tokensOf = (factory, chunks) => {
  const parse = factory(),
    tokens = [];
  for (const chunk of [...chunks, none]) {
    const result = parse(chunk);
    if (result !== none) tokens.push(...getManyValues(result));
  }
  return tokens;
};

const endsHigh = s => {
  const c = s.charCodeAt(s.length - 1);
  return c >= 0xd800 && c <= 0xdbff;
};

// the chunks of each lexeme of the given kind, in order
const lexemes = (tokens, chunkName) => {
  const result = [];
  let current = null;
  for (const token of tokens) {
    if (token.name === chunkName) {
      if (!current) result.push((current = []));
      current.push(token.value);
    } else {
      current = null;
    }
  }
  return result;
};

const pair = '\u{1F600}',
  cases = [
    ['a 256-unit run ends between the halves', ['"x', 'a'.repeat(255) + pair + 'b"'], 'x' + 'a'.repeat(255) + pair + 'b'],
    ['a pair written as two escapes', ['"x', '\\ud83d\\ude00b"'], 'x' + pair + 'b'],
    ['the input splits the pair', ['"x\ud83d', '\ude00b"'], 'x' + pair + 'b']
  ];

for (const [name, factory] of [
  ['parser', jsonParser],
  ['jsonc parser', jsoncParser]
]) {
  test(`${name}: a surrogate pair stays whole in one stringChunk`, t => {
    for (const [title, chunks, expected] of cases) {
      for (const [kind, input, chunkName, valueName] of [
        ['string', chunks, 'stringChunk', 'stringValue'],
        ['key', ['{' + chunks[0], chunks[1] + ':1}'], 'stringChunk', 'keyValue']
      ]) {
        const tokens = tokensOf(factory, input),
          [chunked] = lexemes(tokens, chunkName);
        t.notOk(chunked.slice(0, -1).some(endsHigh), `${title} (${kind}): no chunk ends inside the pair`);
        t.equal(chunked.join(''), expected, `${title} (${kind}): the chunks join to the text`);
        t.equal(tokens.find(token => token.name === valueName).value, expected, `${title} (${kind}): the packed value`);
      }
    }
  });

  test(`${name}: a lone high surrogate at the end of a string is kept`, t => {
    const tokens = tokensOf(factory, ['["x', '\\ud83d", "y\ud83d', '"]']);
    t.deepEqual(
      lexemes(tokens, 'stringChunk').map(chunks => chunks.join('')),
      ['x\ud83d', 'y\ud83d']
    );
    t.deepEqual(
      tokens.filter(token => token.name === 'stringValue').map(token => token.value),
      ['x\ud83d', 'y\ud83d']
    );
  });
}

test('jsonc parser: a comment chunk never ends inside a pair', t => {
  for (const [title, chunks, expected] of [
    ['line comment', ['//a\ud83d', '\ude00b\n1'], '//a' + pair + 'b\n'],
    ['block comment', ['/*a\ud83d', '\ude00b*/1'], '/*a' + pair + 'b*/'],
    // a `*` right before the held half must not end the comment at the next `/`
    ['star before the pair', ['/* *\ud83d', '\ude00/ */1'], '/* *' + pair + '/ */']
  ]) {
    const tokens = tokensOf(jsoncParser, chunks),
      [chunked] = lexemes(tokens, 'commentChunk');
    t.notOk(chunked.slice(0, -1).some(endsHigh), `${title}: no chunk ends inside the pair`);
    t.equal(tokens.find(token => token.name === 'commentValue').value, expected, `${title}: the comment text`);
    t.equal(tokens.find(token => token.name === 'numberValue').value, '1', `${title}: the value after it`);
  }
});

// The cases of stream-chain's asyncBlockWriter test (PR #73). The parser never splits a
// pair, and the stringer escapes the halves of one split by another producer, so the
// file holds the same string, escaped where it was split.
test.asPromise('stringerToFile: a pair cut between two tokens reads back whole', async (t, resolve) => {
  await inTempDir(async dir => {
    const cases = [
      ['abc\uD83D', '\uDE00def'],
      ['\uD83D', '\uDE00'],
      ['é', pair, '字'],
      ['a\uD83D', '\uDE00\uD83D', '\uDE00z']
    ];
    for (const size of [1, 4, 5]) {
      for (const [index, chunks] of cases.entries()) {
        const path = join(dir, `${size}-${index}.json`),
          tokens = [{name: 'startString'}, ...chunks.map(value => ({name: 'stringChunk', value})), {name: 'endString'}];
        await drain(
          pipe(
            function* (list) {
              yield* list;
            },
            stringerToFile(path, {writeBlockSize: size})
          )(tokens)
        );
        t.equal(JSON.parse(await readFile(path, 'utf8')), chunks.join(''), `block size ${size}, fragments ${index}`);
      }
    }
  });
  resolve();
});

// the reported case: fs.WriteStream encodes every chunk on its own
for (const [name, parserFactory, stringerFactory] of [
  ['parser → stringer', parser, stringer],
  ['jsonc parser → jsonc stringer', jsoncParserFactory, jsoncStringer]
]) {
  test.asPromise(`${name}: fs streams write every pair whole`, async (t, resolve) => {
    await inTempDir(async dir => {
      const long = ('a'.repeat(255) + pair).repeat(300),
        text = JSON.stringify([long, {[long]: 'x' + pair}]).replace(/x\u{1F600}/u, 'x\\ud83d\\ude00'),
        src = join(dir, 'in.json'),
        dst = join(dir, 'out.json');
      await writeFile(src, text);
      await pipeline(createReadStream(src, {highWaterMark: 16 * 1024}), parserFactory.asStream(), stringerFactory.asStream(), createWriteStream(dst));
      t.deepEqual(await readFile(dst), Buffer.from(JSON.stringify(JSON.parse(text))));
    });
    resolve();
  });
}

// JSON.stringify writes a lone surrogate as an escape, which keeps the text valid UTF-8
const stringify = (write, tokens) => {
  let text = '';
  for (const token of [...tokens, none]) {
    const piece = write(token);
    if (piece !== none) text += piece;
  }
  return text;
};

const loneCases = ['\ud83d', '\ude00', 'a\ude00\ud83db', pair + '\ud83d', '\ude00' + pair];

for (const [name, parserFactory, stringerFactory] of [
  ['stringer', jsonParser, stringer],
  ['jsonc stringer', jsoncParser, jsoncStringer]
]) {
  test(`${name}: a lone surrogate is written as JSON.stringify writes it`, t => {
    for (const s of loneCases) {
      const expected = JSON.stringify({[s]: [s]});
      for (const options of [{}, {useValues: true}]) {
        t.equal(stringify(stringerFactory(options), tokensOf(parserFactory, [expected])), expected, `${JSON.stringify(s)}, ${JSON.stringify(options)}`);
      }
    }
  });
}

test('disassembler → stringer: a lone surrogate in a value is escaped', t => {
  for (const s of loneCases) {
    const value = {[s]: s};
    t.equal(stringify(stringer(), disassembler()(value)), JSON.stringify(value), JSON.stringify(s));
  }
});
