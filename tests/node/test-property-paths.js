// Property-based tests: string and RegExp path matching keeps per-level state
// instead of joining the stack on every check, so its decisions must equal the
// `stack.join(separator)` semantics it replaced — for the matcher itself and
// end to end through pick and FlexAssembler, with separators and partial
// separators inside keys and filters.
import test from 'tape-six';
import fc from 'fast-check';
import 'tape-six-fast-check';
import chain from 'stream-chain';
import {none, isMany, getManyValues} from 'stream-chain/core';
import {Readable} from 'node:stream';

import {parser} from '../../src/index.js';
import pick from '../../src/core/filters/pick.js';
import FlexAssembler from '../../src/core/utils/flex-assembler.js';
import PathMatcher from '../../src/core/utils/path-matcher.js';

const separator = () => fc.constantFrom('.', '/', '::', ':.');
const part = () => fc.oneof(fc.constantFrom('a', 'b', '', '.', ':', '::', 'a.b', 'a:', ':a', '/'), fc.nat(12), fc.constant(null));
const filterString = () => fc.array(fc.constantFrom('a', 'b', '0', '1', '.', ':', '::', '/', ''), {maxLength: 5}).map(parts => parts.join(''));
const regExp = () => fc.constantFrom(/^a/, /a$/, /\d/, /^$/, /::/, /a\.b/, /a/g, /^a[.:/]+b/y);

const joinString = (filter, sep) => stack => {
  const path = stack.join(sep);
  return path === filter || path.startsWith(filter + sep);
};
const joinRegExp = (re, sep) => stack => {
  re.lastIndex = 0;
  return re.test(stack.join(sep));
};

const agrees = (matcher, reference, stack) => {
  for (let i = 0; i <= stack.length; ++i) {
    const prefix = stack.slice(0, i),
      expected = reference(prefix);
    if (matcher.test(prefix) !== expected) return false;
    matcher.extend(prefix);
    if (matcher.testRecorded(prefix) !== expected) return false;
  }
  return true;
};

test('PathMatcher decides like stack.join()', async t => {
  await t.prop(
    [fc.array(part(), {maxLength: 6}), separator(), filterString()],
    (stack, sep, filter) => agrees(new PathMatcher(filter, sep), joinString(filter, sep), stack),
    {numRuns: 2000},
    'string filters: exact and prefix matches'
  );
  await t.prop(
    [fc.array(part(), {maxLength: 6}), separator(), regExp()],
    (stack, sep, re) => agrees(new PathMatcher(re, sep), joinRegExp(re, sep), stack),
    {numRuns: 1000},
    'RegExp filters'
  );
});

test('PathMatcher passes the stack and chunk to a function filter', t => {
  const calls = [],
    matcher = new PathMatcher((stack, chunk) => {
      calls.push([stack, chunk]);
      return true;
    }),
    stack = ['a'],
    chunk = {name: 'nullValue'};
  t.ok(matcher.test(stack, chunk));
  t.notOk(matcher.stateful);
  t.equal(calls.length, 1);
  t.equal(calls[0][0], stack);
  t.equal(calls[0][1], chunk);
});

const key = () => fc.constantFrom('a', 'b', '', 'a.b', '0', ':', 'a:', '/');
const {value: document} = fc.letrec(tie => ({
  value: fc.oneof({depthSize: 'small'}, fc.integer(), fc.constant(null), fc.boolean(), fc.string({maxLength: 3}), tie('array'), tie('object')),
  array: fc.array(tie('value'), {maxLength: 3}),
  object: fc.dictionary(key(), tie('value'), {maxKeys: 3})
}));

const tokensOf = (text, options) =>
  new Promise((resolve, reject) => {
    const tokens = [],
      pipeline = chain([Readable.from([text]), parser(options)]);
    pipeline.on('data', token => tokens.push(token));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(tokens));
  });

const runPick = (tokens, options) => {
  const f = pick(options),
    out = [];
  const collect = result => {
    if (result === none) return;
    if (isMany(result)) out.push(...getManyValues(result));
    else out.push(result);
  };
  for (const token of tokens) collect(f(token));
  collect(f(none));
  return JSON.stringify(out);
};

test('pick: string and RegExp filters select like a join-based function filter', async t => {
  await t.prop(
    [document, separator(), filterString(), fc.boolean()],
    async (value, sep, filter, packKeys) => {
      const tokens = await tokensOf(JSON.stringify(value), {packKeys});
      return runPick(tokens, {filter, pathSeparator: sep}) === runPick(tokens, {filter: joinString(filter, sep), pathSeparator: sep});
    },
    {numRuns: 300},
    'string filters, packed and streamed-only keys'
  );
  await t.prop(
    [document, separator(), regExp(), fc.boolean()],
    async (value, sep, re, packKeys) => {
      const tokens = await tokensOf(JSON.stringify(value), {packKeys});
      return runPick(tokens, {filter: re, pathSeparator: sep}) === runPick(tokens, {filter: joinRegExp(re, sep), pathSeparator: sep});
    },
    {numRuns: 300},
    'RegExp filters, packed and streamed-only keys'
  );
});

const marked = filter => ({
  objectRules: [
    {
      filter,
      create: () => ({}),
      add: (o, k, v) => {
        o[k] = v;
      },
      finalize: o => ({rule: o})
    }
  ],
  arrayRules: [{filter, create: () => [], add: (a, v) => a.push(v), finalize: a => ({rule: a})}]
});

const assemble = (tokens, options) => {
  const asm = new FlexAssembler(options);
  for (const token of tokens) asm.consume(token);
  return JSON.stringify(asm.current);
};

test('FlexAssembler: string and RegExp rules match like join-based function rules', async t => {
  await t.prop(
    [document, separator(), filterString()],
    async (value, sep, filter) => {
      const tokens = await tokensOf(JSON.stringify(value));
      return assemble(tokens, {...marked(filter), pathSeparator: sep}) === assemble(tokens, {...marked(joinString(filter, sep)), pathSeparator: sep});
    },
    {numRuns: 300},
    'string rules'
  );
  await t.prop(
    [document, separator(), regExp()],
    async (value, sep, re) => {
      const tokens = await tokensOf(JSON.stringify(value));
      return assemble(tokens, {...marked(re), pathSeparator: sep}) === assemble(tokens, {...marked(joinRegExp(re, sep)), pathSeparator: sep});
    },
    {numRuns: 300},
    'RegExp rules'
  );
});
