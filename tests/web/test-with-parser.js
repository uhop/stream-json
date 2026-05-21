import test from 'tape-six';

import withParser from '../../src/web/utils/with-parser.js';
import streamArray from '../../src/core/streamers/stream-array.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('withParser (web): wraps a token-consuming factory with a parser', async (t, resolve, reject) => {
  try {
    const pattern = [10, 20, 30];
    const out = await runWebChain([withParser.asWebStream(streamArray, {packKeys: true})], [JSON.stringify(pattern)]);
    const result = [];
    for (const o of out) result[o.key] = o.value;
    t.deepEqual(result, pattern, 'token-consuming factory ran behind a parser');
    resolve();
  } catch (e) {
    reject(e);
  }
});
