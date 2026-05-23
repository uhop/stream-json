import test from 'tape-six';
import chain from 'stream-chain';

import withParser from '../../src/utils/with-parser.js';
import streamArray from '../../src/core/streamers/stream-array.js';

import {readString} from '../helpers.js';

test.asPromise('withParser: wraps a token-consuming factory with a parser', (t, resolve, reject) => {
  const pattern = [10, 20, 30],
    result = [],
    pipeline = chain([readString(JSON.stringify(pattern)), withParser(streamArray, {packKeys: true})]);

  pipeline.on('data', o => (result[o.key] = o.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });
});
