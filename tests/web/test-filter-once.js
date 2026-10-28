import test from 'tape-six';
import {chain} from 'stream-chain/web';
import pipe from 'stream-chain/utils/pipe.js';
import drainRun from 'stream-chain/utils/drain.js';

import {parser} from '../../src/web/parser.js';
import pick from '../../src/web/filters/pick.js';
import ignore from '../../src/web/filters/ignore.js';
import replace from '../../src/web/filters/replace.js';
import filter from '../../src/web/filters/filter.js';
import stringer from '../../src/web/stringer.js';

import {readWebString, drain} from '../web-helpers.js';

// `b` precedes the first match, so an unmatched value ends before `once` may act
const doc = (first, second) => ({b: 'z', a: first, n: 5, c: {a: second}});

const values = [
  ['strings', 'x', 'y'],
  ['numbers', 1, 3],
  ['objects', {k: 1}, {k: 3}],
  ['arrays', [1], [3]],
  ['literals', true, null]
];

const configs = [
  ['packed and streamed', {}, {}],
  ['packed only', {streamValues: false}, {useValues: true}],
  ['streamed values', {packKeys: true, packStrings: false, packNumbers: false}, {}]
];

const filters = [
  ['pick', options => pick(options), (first, second) => first],
  ['ignore', options => ignore(options), (first, second) => ({b: 'z', n: 5, c: {a: second}})],
  ['replace', options => replace({replacement: 'R', ...options}), (first, second) => ({b: 'z', a: 'R', n: 5, c: {a: second}})],
  ['filter', options => filter(options), first => ({a: first && typeof first == 'object' ? (Array.isArray(first) ? [] : {}) : first})],
  ['filter acceptObjects', options => filter({acceptObjects: true, ...options}), first => ({a: first})]
];

for (const [filterName, make, expected] of filters) {
  for (const [configName, parserOptions, stringerOptions] of configs) {
    for (const [kind, first, second] of values) {
      test(`${filterName} (web) with once: ${kind}, ${configName}`, async t => {
        const input = JSON.stringify(doc(first, second));
        const pipeline = chain([
          readWebString(input),
          parser(parserOptions),
          make({filter: /(^|\.)a$/, once: true, ...parserOptions}),
          stringer(stringerOptions)
        ]);
        const output = (await drain(pipeline)).join('');
        t.deepEqual(JSON.parse(output), expected(first, second), output);
      });
    }
  }
}

// malformed past the match: the run resolves only when the parser never reaches the tail
const stopInput = '{"meta":{"x":1},"rows":[1,2,3,4,5,6,7,8,9,x}';

const readAll = async readable => {
  let text = '';
  for await (const chunk of readable) text += chunk;
  return text;
};

test('pick (web) with once stops the chain after its match', async t => {
  const pipeline = chain([readWebString(stopInput, 4), parser(), pick({filter: 'meta', once: true}), stringer()]);
  t.equal((await drain(pipeline)).join(''), '{"x":1}');
});

test('pick (web) with once stops a piped web stream after its match', async t => {
  const readable = readWebString(stopInput, 4)
    .pipeThrough(pick.withParserAsWebStream({filter: 'meta', once: true}))
    .pipeThrough(stringer.asWebStream());
  t.equal(await readAll(readable), '{"x":1}');
});

test('pick with once stops a pipe() run after its match', async t => {
  const output = [];
  await drainRun(
    pipe(
      function* (text) {
        for (let i = 0; i < text.length; i += 4) yield text.slice(i, i + 4);
      },
      parser(),
      pick({filter: 'meta', once: true}),
      stringer(),
      chunk => void output.push(chunk)
    )(stopInput)
  );
  t.equal(output.join(''), '{"x":1}');
});

test('pick (web) with once ends normally when its match ends the input', async t => {
  const pipeline = chain([readWebString('{"rows":[1,2],"meta":{"x":1}}', 4), parser(), pick({filter: 'meta', once: true}), stringer()]);
  t.equal((await drain(pipeline)).join(''), '{"x":1}');
});
