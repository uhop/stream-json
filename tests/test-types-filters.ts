import type {Duplex} from 'node:stream';
import {none} from 'stream-chain/defs.js';

import test from 'tape-six';
import filterBase from '../src/filters/filter-base.js';
import pick from '../src/filters/pick.js';
import ignore from '../src/filters/ignore.js';
import replace from '../src/filters/replace.js';
import filter from '../src/filters/filter.js';

test('types: filterBase', async t => {
  await t.test('factory', t => {
    const fb = filterBase();
    t.equal(typeof fb, 'function');
  });

  await t.test('FilterBaseOptions interface', t => {
    const opts: filterBase.FilterBaseOptions = {
      filter: /^a/,
      once: true,
      pathSeparator: '.',
      streamValues: false,
      streamKeys: true,
      packKeys: true
    };
    t.ok(opts);

    const fnFilter: filterBase.FilterBaseOptions = {filter: stack => stack.length > 1};
    t.ok(fnFilter);

    const strFilter: filterBase.FilterBaseOptions = {filter: 'a.b'};
    t.ok(strFilter);
  });

  await t.test('makeStackDiffer', t => {
    const differ = filterBase.makeStackDiffer();
    t.equal(typeof differ, 'function');

    const differWithStack = filterBase.makeStackDiffer(['a', 0]);
    t.equal(typeof differWithStack, 'function');
  });
});

test('types: pick', t => {
  const fn = pick({filter: 'a'});
  t.equal(typeof fn, 'function');

  const as: Duplex = pick.asStream({filter: 'a'});
  t.ok(as);

  const stream: Duplex = pick.withParserAsStream({filter: /^key/});
  t.ok(stream);

  const wp = pick.withParser({filter: 'data', packKeys: true});
  t.equal(typeof wp, 'function');
});

test('types: ignore', t => {
  const fn = ignore({filter: 'a.b'});
  t.equal(typeof fn, 'function');

  const as: Duplex = ignore.asStream({filter: 'a.b'});
  t.ok(as);

  const stream: Duplex = ignore.withParserAsStream({filter: stack => true});
  t.ok(stream);

  const wp = ignore.withParser({filter: 'temp', once: true});
  t.equal(typeof wp, 'function');
});

test('types: replace', t => {
  const fn = replace({filter: 'a', replacement: () => none});
  t.equal(typeof fn, 'function');

  const fnTokens = replace({filter: 'old', replacement: [{name: 'nullValue', value: null}]});
  t.equal(typeof fnTokens, 'function');

  const as: Duplex = replace.asStream({filter: 'a'});
  t.ok(as);

  const stream: Duplex = replace.withParserAsStream({filter: 'x'});
  t.ok(stream);

  const opts: replace.ReplaceOptions = {
    filter: 'key',
    replacement: (stack, chunk, options) => ({name: 'nullValue', value: null})
  };
  t.ok(opts);
});

test('types: filter', t => {
  const fn = filter({filter: 'a'});
  t.equal(typeof fn, 'function');

  const fnAccept = filter({filter: 'a', acceptObjects: true});
  t.equal(typeof fnAccept, 'function');

  const as: Duplex = filter.asStream({filter: 'a'});
  t.ok(as);

  const stream: Duplex = filter.withParserAsStream({filter: /^data/});
  t.ok(stream);

  const opts: filter.FilterOptions = {acceptObjects: true, filter: 'x'};
  t.ok(opts);
});
