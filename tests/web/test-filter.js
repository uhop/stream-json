import test from 'tape-six';

import parser from '../../src/web/parser.js';
import filter from '../../src/web/filters/filter.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('filter (web): regex filter via withParser', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const out = await runWebChain([filter.withParserAsWebStream({packValues: false, filter: /^(|a|c)$/})], [input]);
    t.deepEqual(
      out,
      [
        {name: 'startObject'},
        {name: 'startKey'},
        {name: 'stringChunk', value: 'a'},
        {name: 'endKey'},
        {name: 'keyValue', value: 'a'},
        {name: 'startNumber'},
        {name: 'numberChunk', value: '1'},
        {name: 'endNumber'},
        {name: 'startKey'},
        {name: 'stringChunk', value: 'c'},
        {name: 'endKey'},
        {name: 'keyValue', value: 'c'},
        {name: 'startArray'},
        {name: 'endArray'},
        {name: 'endObject'}
      ],
      'filter kept tokens for matching keys'
    );
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('filter (web): standalone factory with packed keys upstream', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const out = await runWebChain([parser.asWebStream({packKeys: true, packValues: false}), filter.asWebStream({filter: /^(|a|c)$/})], [input]);
    const names = out.map(t => t.name);
    t.ok(names.includes('numberChunk'), 'value under "a" survived');
    t.ok(!names.includes('trueValue'), 'value under "b" was dropped');
    resolve();
  } catch (e) {
    reject(e);
  }
});
