import test from 'tape-six';

import replace from '../../src/web/filters/replace.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('replace (web): default removes matched values', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const out = await runWebChain([replace.withParserAsWebStream({packValues: false, filter: /^a$/})], [input]);
    const names = out.map(t => t.name);
    t.ok(!names.includes('numberChunk'), 'value under "a" omitted entirely (default replacement)');
    t.ok(names.includes('trueValue'), 'non-matching values retained');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace (web): explicit nullToken replacement', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const nullToken = {name: 'nullValue', value: null};
    const out = await runWebChain(
      [
        replace.withParserAsWebStream({
          packValues: false,
          filter: /^a$/,
          replacement: () => nullToken
        })
      ],
      [input]
    );
    const names = out.map(t => t.name);
    t.ok(names.includes('nullValue'), 'matched value replaced with null token');
    resolve();
  } catch (e) {
    reject(e);
  }
});
