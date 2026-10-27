import test from 'tape-six';
import {chain} from 'stream-chain/web';

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
