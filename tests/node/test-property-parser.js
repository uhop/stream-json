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

const splitAt = (text, offsets) => {
  const cuts = [...new Set(offsets.map(o => o % (text.length + 1)))].sort((a, b) => a - b);
  const chunks = [];
  let prev = 0;
  for (const cut of cuts) {
    if (cut > prev) chunks.push(text.slice(prev, cut));
    prev = cut;
  }
  if (prev < text.length) chunks.push(text.slice(prev));
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
const json = () => fc.jsonValue({maxDepth: 4});
const offsets = () => fc.array(fc.nat(4096), {maxLength: 12});

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
const commentBody = () => fc.string({maxLength: 12}).filter(s => !s.includes('*/') && !/[\r\n]/.test(s));
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
