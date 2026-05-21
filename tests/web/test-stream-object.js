import test from 'tape-six';

import streamObject from '../../src/web/streamers/stream-object.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('streamObject (web): streams object entries', async (t, resolve, reject) => {
  try {
    const pattern = {a: 1, b: true, c: null, d: [1, 2], e: {x: 'y'}};
    const out = await runWebChain([streamObject.withParserAsWebStream()], [JSON.stringify(pattern)]);
    const result = {};
    for (const o of out) result[o.key] = o.value;
    t.deepEqual(result, pattern, 'each object entry streamed');
    resolve();
  } catch (e) {
    reject(e);
  }
});
