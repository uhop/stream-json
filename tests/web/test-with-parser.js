// Mirror of tests/node/test-with-parser.js. See tests/web/test-stringer.js
// for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import withParser from '../../src/web/utils/with-parser.js';
import streamArray from '../../src/core/streamers/stream-array.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('withParser (web): wraps a token-consuming factory with a parser', async (t, resolve, reject) => {
  try {
    const pattern = [10, 20, 30];
    const pipeline = chain([readWebString(JSON.stringify(pattern)), withParser(streamArray, {packKeys: true})]);
    const out = await drain(pipeline);
    const result = [];
    for (const o of out) result[o.key] = o.value;
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});
