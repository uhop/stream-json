// Property-based tests (tape-six-fast-check): the streaming invariants that
// example-based tests structurally miss — the same document split at arbitrary
// chunk boundaries must yield the same tokens (GHSA-hqr4-qq8f-hg3x was exactly
// this class), and the parser/assembler and disassembler/stringer pairs must
// round-trip against JSON.parse / JSON.stringify.
import test from 'tape-six';
import fc from 'fast-check';
import 'tape-six-fast-check';
import chain from 'stream-chain';
import {none} from 'stream-chain/core';
import {Readable} from 'node:stream';

import {parser} from '../../src/index.js';
import {parser as jsoncParser} from '../../src/jsonc/parser.js';
import Assembler from '../../src/assembler.js';
import {disassembler} from '../../src/disassembler.js';
import {stringer} from '../../src/stringer.js';
import {stringer as jsoncStringer} from '../../src/jsonc/stringer.js';

// a Buffer is split at byte offsets, inside UTF-8 sequences too
const splitAt = (text, offsets) => {
  const cuts = [...new Set(offsets.map(o => o % (text.length + 1)))].sort((a, b) => a - b);
  const piece = (from, to) => (typeof text == 'string' ? text.slice(from, to) : text.subarray(from, to));
  const chunks = [];
  let prev = 0;
  for (const cut of cuts) {
    if (cut > prev) chunks.push(piece(prev, cut));
    prev = cut;
  }
  if (prev < text.length) chunks.push(piece(prev));
  return chunks;
};

const tokensOf = (chunks, factory, options) =>
  new Promise((resolve, reject) => {
    const tokens = [],
      pipeline = chain([Readable.from(chunks), factory(options)]);
    pipeline.on('data', token => tokens.push(token));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(tokens));
  });

// merge streamed pieces so two splits of the same text compare equal
const coalesce = tokens => {
  const out = [];
  for (const token of tokens) {
    const last = out[out.length - 1];
    if (last && last.name === token.name && (token.name === 'stringChunk' || token.name === 'numberChunk' || token.name === 'commentChunk')) {
      out[out.length - 1] = {name: last.name, value: last.value + token.value};
    } else {
      out.push(token);
    }
  }
  return out.filter(token => token.name !== 'whitespace');
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// The defaults are short ASCII strings: 'binary' adds full Unicode and control
// characters (escapes), and size 'max' strings pass the parser's 256-unit runs.
const longString = () => fc.string({unit: 'binary', maxLength: 600, size: 'max'});
const json = () =>
  fc.oneof(fc.jsonValue({maxDepth: 4, stringUnit: 'binary'}), fc.array(longString(), {maxLength: 3}), fc.dictionary(longString(), longString(), {maxKeys: 3}));
const offsets = () => fc.array(fc.nat(1 << 16), {maxLength: 12});

test('parser: chunk boundaries do not change the token stream', async t => {
  await t.prop(
    [json(), offsets()],
    async (value, cuts) => {
      const text = JSON.stringify(value);
      return same(await tokensOf([text], parser, {streamValues: false}), await tokensOf(splitAt(text, cuts), parser, {streamValues: false}));
    },
    {numRuns: 100},
    'packed tokens are split-invariant'
  );
  await t.prop(
    [json(), offsets()],
    async (value, cuts) => {
      const text = JSON.stringify(value);
      return same(coalesce(await tokensOf([text], parser)), coalesce(await tokensOf(splitAt(text, cuts), parser)));
    },
    {numRuns: 100},
    'streamed chunks coalesce to the same tokens'
  );
});

test('parser → assembler round-trips against JSON.parse', async t => {
  await t.prop(
    [json(), offsets()],
    async (value, cuts) => {
      const asm = new Assembler();
      for (const token of await tokensOf(splitAt(JSON.stringify(value), cuts), parser)) asm.consume(token);
      return same(asm.current, value);
    },
    {numRuns: 100},
    'assembled value equals the original'
  );
});

test('disassembler → stringer round-trips against JSON.stringify', async t => {
  await t.prop(
    [json()],
    value => {
      const write = stringer();
      let text = '';
      for (const token of disassembler()(value)) {
        const piece = write(token);
        if (piece !== none) text += piece;
      }
      const tail = write(none);
      if (tail !== none) text += tail;
      return same(JSON.parse(text), value);
    },
    {numRuns: 200},
    'stringer output parses back to the original'
  );
});

// JSONC: comments and whitespace inserted between tokens, then split anywhere —
// comments may straddle chunk boundaries, including their delimiters
const commentBody = () => fc.string({unit: 'binary', maxLength: 12}).filter(s => !s.includes('*/') && !/[\r\n]/.test(s));
const decorate = (pretty, kinds, bodies) => {
  let i = 0;
  return pretty.replace(/\n/g, () => {
    const kind = kinds[i % kinds.length],
      body = bodies[i % bodies.length];
    ++i;
    return kind === 1 ? ' /*' + body + '*/\n' : kind === 2 ? ' //' + body + '\n' : '\n';
  });
};

test('jsonc parser: comments survive arbitrary chunk boundaries', async t => {
  await t.prop(
    [json(), fc.array(fc.constantFrom(0, 1, 2), {minLength: 1, maxLength: 8}), fc.array(commentBody(), {minLength: 1, maxLength: 8}), offsets()],
    async (value, kinds, bodies, cuts) => {
      const text = decorate(JSON.stringify(value, null, 1), kinds, bodies);
      const whole = coalesce(await tokensOf([text], jsoncParser)),
        chunked = coalesce(await tokensOf(splitAt(text, cuts), jsoncParser));
      if (!same(whole, chunked)) return false;
      const asm = new Assembler();
      for (const token of chunked) asm.consume(token);
      return same(asm.current, value);
    },
    {numRuns: 100},
    'tokens and comments are split-invariant'
  );
});

// A sink that encodes each chunk alone (fs.WriteStream) needs every surrogate pair
// whole within one chunk. Strings past the parser's 256-unit runs, pairs written as
// escapes, and input split inside a pair are the three ways a pair could be cut.
// Lone halves, which JSON.stringify writes as escapes, must come out escaped too.
const astralUnit = () => fc.constantFrom('a', ' ', '*', 'é', '\u{1F600}', '\u{10FFFF}', '\ud83d', '\ude00', '"', '\\');
// size 'max': the default size never lets a string reach the 256-unit runs
const astralString = () => fc.string({unit: astralUnit(), maxLength: 600, size: 'max'});
const astralValue = () => fc.oneof(astralString(), fc.array(astralString(), {maxLength: 3}), fc.dictionary(astralString(), astralString(), {maxKeys: 3}));
const escapeFlags = () => fc.array(fc.boolean(), {minLength: 1, maxLength: 8});
const astralCommentBody = () => fc.string({unit: fc.constantFrom('a', '*', '/', '\u{1F600}', '\u{10FFFF}'), maxLength: 300}).filter(s => !s.includes('*/'));

const escapePairs = (text, flags) => {
  let i = 0;
  return text.replace(/[\u{10000}-\u{10FFFF}]/gu, ch =>
    flags[i++ % flags.length] ? '\\u' + ch.charCodeAt(0).toString(16) + '\\u' + ch.charCodeAt(1).toString(16) : ch
  );
};

const endsHigh = s => {
  const c = s.charCodeAt(s.length - 1);
  return c >= 0xd800 && c <= 0xdbff;
};
const startsLow = s => {
  const c = s.charCodeAt(0);
  return c >= 0xdc00 && c <= 0xdfff;
};
// a lone high half may end a chunk; a pair's halves may not sit in two
const cutsPair = tokens =>
  tokens.some(
    (token, i) =>
      (token.name === 'stringChunk' || token.name === 'commentChunk') &&
      tokens[i + 1]?.name === token.name &&
      endsHigh(token.value) &&
      startsLow(tokens[i + 1].value)
  );

const assembled = tokens => {
  const asm = new Assembler();
  for (const token of tokens) asm.consume(token);
  return asm.current;
};

const outputOf = (chunks, stages) =>
  new Promise((resolve, reject) => {
    const pieces = [],
      pipeline = chain([Readable.from(chunks), ...stages]);
    pipeline.on('data', piece => pieces.push(piece));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(pieces));
  });

const encodesAlone = pieces => Buffer.concat(pieces.map(piece => Buffer.from(piece))).equals(Buffer.from(pieces.join('')));
// UTF-8 has no lone surrogate: one written raw comes back as U+FFFD
const survivesUtf8 = text => Buffer.from(text).toString() === text;

test('parser: no chunk boundary cuts a surrogate pair', async t => {
  await t.prop(
    [astralValue(), escapeFlags(), offsets()],
    async (value, flags, cuts) => {
      const tokens = await tokensOf(splitAt(escapePairs(JSON.stringify(value), flags), cuts), parser);
      return !cutsPair(tokens) && same(assembled(tokens), value);
    },
    {numRuns: 200},
    'string and key chunks keep each pair whole'
  );
  await t.prop(
    [
      astralValue(),
      escapeFlags(),
      fc.array(fc.constantFrom(0, 1, 2), {minLength: 1, maxLength: 8}),
      fc.array(astralCommentBody(), {minLength: 1, maxLength: 8}),
      offsets()
    ],
    async (value, flags, kinds, bodies, cuts) => {
      const text = decorate(escapePairs(JSON.stringify(value, null, 1), flags), kinds, bodies),
        tokens = await tokensOf(splitAt(text, cuts), jsoncParser);
      return !cutsPair(tokens) && same(assembled(tokens), value);
    },
    {numRuns: 200},
    'jsonc string, key, and comment chunks keep each pair whole'
  );
});

test('parser → stringer: each output piece encodes alone to the same bytes', async t => {
  await t.prop(
    [astralValue(), escapeFlags(), offsets()],
    async (value, flags, cuts) => {
      const pieces = await outputOf(splitAt(escapePairs(JSON.stringify(value), flags), cuts), [parser(), stringer()]);
      return encodesAlone(pieces) && survivesUtf8(pieces.join('')) && same(JSON.parse(pieces.join('')), value);
    },
    {numRuns: 200},
    'stringer pieces keep each pair whole and escape lone halves'
  );
  await t.prop(
    [
      astralValue(),
      escapeFlags(),
      fc.array(fc.constantFrom(0, 1, 2), {minLength: 1, maxLength: 8}),
      fc.array(astralCommentBody(), {minLength: 1, maxLength: 8}),
      offsets()
    ],
    async (value, flags, kinds, bodies, cuts) => {
      const text = decorate(escapePairs(JSON.stringify(value, null, 1), flags), kinds, bodies),
        pieces = await outputOf(splitAt(text, cuts), [jsoncParser(), jsoncStringer()]);
      return encodesAlone(pieces) && survivesUtf8(pieces.join(''));
    },
    {numRuns: 200},
    'jsonc stringer pieces keep each pair whole and escape lone halves'
  );
});

// exact only while astralUnit holds no U+007F-U+009F, which the stringer escapes and JSON.stringify does not
test('disassembler → stringer writes what JSON.stringify writes', async t => {
  await t.prop(
    [astralValue()],
    value => {
      const write = stringer();
      let text = '';
      for (const token of disassembler()(value)) {
        const piece = write(token);
        if (piece !== none) text += piece;
      }
      const tail = write(none);
      if (tail !== none) text += tail;
      return text === JSON.stringify(value);
    },
    {numRuns: 200},
    'the same text, lone halves escaped'
  );
});

test('parser: byte boundaries inside UTF-8 sequences do not change the value', async t => {
  for (const [name, factory] of [
    ['parser', parser],
    ['jsonc parser', jsoncParser]
  ]) {
    await t.prop(
      [json(), offsets()],
      async (value, cuts) => same(assembled(await tokensOf(splitAt(Buffer.from(JSON.stringify(value)), cuts), factory)), value),
      {numRuns: 100},
      `${name}: assembled value equals the original`
    );
  }
});

// a small key alphabet, so a listed key often meets a property
const listedKey = () => fc.constantFrom('a', 'b', 'c', '0', '1');
const {keyed} = fc.letrec(tie => ({
  keyed: fc.oneof(
    {depthSize: 'small'},
    fc.integer(),
    fc.string(),
    fc.boolean(),
    fc.constant(null),
    fc.array(tie('keyed'), {maxLength: 3}),
    fc.dictionary(listedKey(), tie('keyed'), {maxKeys: 4})
  )
}));
const replacerList = () => fc.array(fc.oneof(listedKey(), fc.constantFrom(0, 1, '__proto__')), {maxLength: 6});

test('disassembler with an array replacer writes what JSON.stringify writes', async t => {
  await t.prop(
    [keyed, replacerList()],
    (value, replacer) => {
      const write = stringer();
      let text = '';
      for (const token of disassembler({replacer})(value)) {
        const piece = write(token);
        if (piece !== none) text += piece;
      }
      const tail = write(none);
      if (tail !== none) text += tail;
      return text === JSON.stringify(value, replacer);
    },
    {numRuns: 300},
    'keys in the list order, read through the prototype'
  );
});

// Documents generated from JSON's grammar, not from JSON.stringify, which writes one
// spelling of each value. Swarm testing: each run draws its own weights over the
// spellings, so rare forms meet each other. Each document comes with a JSONC twin:
// the same text with comments where whitespace may go and trailing commas.
const spellings = () =>
  fc.record({
    ws: fc.nat(3),
    escape: fc.nat(3),
    unicode: fc.nat(3),
    astral: fc.nat(3),
    fraction: fc.nat(3),
    exponent: fc.nat(3),
    comment: fc.nat(3),
    trailing: fc.nat(3)
  });

const textsOf = weights => {
  const pick = entries => fc.oneof(...entries.filter(([, weight]) => weight > 0).map(([arbitrary, weight]) => ({arbitrary, weight})));
  const twin = text => text.map(s => [s, s]);
  const anyCase = s => fc.boolean().map(upper => (upper ? s.toUpperCase() : s));
  const blank = weights.ws ? fc.string({unit: fc.constantFrom(' ', '\t', '\n', '\r'), maxLength: weights.ws}) : fc.constant('');
  const commentBody = fc.string({unit: fc.constantFrom('a', ' ', '*', '/', '\u{1F600}'), maxLength: 6}).filter(s => !s.includes('*/'));
  const comment = pick([
    [fc.constant(''), 3],
    [commentBody.map(s => '/*' + s + '*/'), weights.comment],
    [commentBody.map(s => '//' + s + '\n'), weights.comment]
  ]);
  const ws = fc.tuple(blank, comment, blank).map(([a, c, b]) => [a + b, a + c + b]);
  const unit = pick([
    [fc.constantFrom('a', 'Z', '0', ' ', '/', '\u007f', 'é', '字'), 4],
    [fc.constantFrom('\\"', '\\\\', '\\/', '\\b', '\\f', '\\n', '\\r', '\\t'), weights.escape],
    [
      fc
        .constantFrom('0041', '0000', '001f', '00e9', '0022', '005c', '002f', 'feff', 'd83d', 'de00')
        .chain(anyCase)
        .map(h => '\\u' + h),
      weights.unicode
    ],
    [fc.constantFrom('\u{1F600}', '\u{10FFFF}'), weights.astral],
    [fc.tuple(anyCase('d83d'), anyCase('de00')).map(([h, l]) => '\\u' + h + '\\u' + l), weights.astral]
  ]);
  const string = fc.array(unit, {maxLength: 8}).map(units => '"' + units.join('') + '"');
  const digits = (minLength, maxLength) => fc.string({unit: fc.constantFrom(...'0123456789'), minLength, maxLength});
  const number = fc
    .tuple(
      fc.constantFrom('', '-'),
      fc.oneof(
        fc.constant('0'),
        fc.tuple(fc.constantFrom(...'123456789'), digits(0, 4)).map(([a, b]) => a + b)
      ),
      pick([
        [fc.constant(''), 3],
        [digits(1, 4).map(d => '.' + d), weights.fraction]
      ]),
      pick([
        [fc.constant(''), 3],
        [fc.tuple(fc.constantFrom('e', 'E'), fc.constantFrom('', '+', '-'), digits(1, 3)).map(parts => parts.join('')), weights.exponent]
      ])
    )
    .map(parts => parts.join(''));
  const trailing = pick([
    [fc.constant(''), 3],
    [ws.map(([, w]) => ',' + w), weights.trailing]
  ]);
  const container = (open, close, items) =>
    fc
      .tuple(ws, items, trailing)
      .map(([w, list, comma]) =>
        list.length
          ? [open + list.map(([json]) => json).join(',') + close, open + list.map(([, jsonc]) => jsonc).join(',') + comma + close]
          : [open + w[0] + close, open + w[1] + close]
      );
  const {value} = fc.letrec(tie => ({
    value: fc.oneof({depthSize: 'small', maxDepth: 4}, twin(number), twin(string), twin(fc.constantFrom('true', 'false', 'null')), tie('array'), tie('object')),
    array: container(
      '[',
      ']',
      fc.array(
        fc.tuple(ws, tie('value'), ws).map(([a, v, b]) => [a[0] + v[0] + b[0], a[1] + v[1] + b[1]]),
        {maxLength: 4}
      )
    ),
    object: container(
      '{',
      '}',
      fc
        .array(fc.tuple(ws, string, ws, ws, tie('value'), ws), {maxLength: 4})
        .map(entries => entries.map(([a, k, b, c, v, d]) => [a[0] + k + b[0] + ':' + c[0] + v[0] + d[0], a[1] + k + b[1] + ':' + c[1] + v[1] + d[1]]))
    )
  }));
  return fc.tuple(ws, value, ws).map(([a, v, b]) => [a[0] + v[0] + b[0], a[1] + v[1] + b[1]]);
};
const grammarTexts = () => spellings().chain(textsOf);

const piecesOf = (text, size) => {
  const pieces = [];
  for (let i = 0; i < text.length; i += size) pieces.push(text.slice(i, i + size));
  return pieces;
};
// every piece size up to 12, as the sliding-window tests do, and a random set of cuts
const splitsOf = (text, cuts) => [[text], ...Array.from({length: Math.min(text.length, 12)}, (_, i) => piecesOf(text, i + 1)), splitAt(text, cuts)];

const outcomeOf = async (chunks, factory) => {
  try {
    return {ok: true, value: JSON.stringify(assembled(await tokensOf(chunks, factory)))};
  } catch {
    return {ok: false};
  }
};
const nativeOutcome = text => {
  try {
    return {ok: true, value: JSON.stringify(JSON.parse(text))};
  } catch {
    return {ok: false};
  }
};
const sameOutcome = (a, b) => a.ok === b.ok && a.value === b.value;

test('parser: documents generated from the grammar parse as JSON.parse parses them', async t => {
  await t.prop(
    [grammarTexts(), offsets()],
    async ([json], cuts) => {
      const expected = nativeOutcome(json),
        whole = coalesce(await tokensOf([json], parser));
      for (const chunks of splitsOf(json, cuts)) {
        if (!sameOutcome(await outcomeOf(chunks, parser), expected)) return false;
        if (!same(coalesce(await tokensOf(chunks, parser)), whole)) return false;
      }
      return true;
    },
    {numRuns: 200},
    'the value and the streamed tokens at every split'
  );
  await t.prop(
    [grammarTexts(), offsets()],
    async ([json, jsonc], cuts) => {
      const expected = nativeOutcome(json);
      for (const chunks of splitsOf(jsonc, cuts)) {
        if (!sameOutcome(await outcomeOf(chunks, jsoncParser), expected)) return false;
      }
      return true;
    },
    {numRuns: 200},
    'jsonc: comments and trailing commas leave the value of the plain text'
  );
});

test('parser: a mutated document is accepted or rejected as JSON.parse does', async t => {
  await t.prop(
    [grammarTexts(), fc.nat(), fc.constantFrom('delete', 'insert', 'replace'), fc.constantFrom(...'{}[],:"\\01-+.eEtnux /*', '\u0001', 'é'), offsets()],
    async ([json], at, op, ch, cuts) => {
      const i = at % (json.length + 1),
        text =
          op === 'delete'
            ? json.slice(0, i) + json.slice(i + 1)
            : op === 'insert'
              ? json.slice(0, i) + ch + json.slice(i)
              : json.slice(0, i) + ch + json.slice(i + 1),
        expected = nativeOutcome(text);
      for (const chunks of [[text], piecesOf(text, 1), splitAt(text, cuts)]) {
        if (!sameOutcome(await outcomeOf(chunks, parser), expected)) return false;
      }
      return true;
    },
    {numRuns: 300},
    'the same verdict, and the same value when accepted, at every split'
  );
});
