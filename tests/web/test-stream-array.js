import test from 'tape-six';

import streamArray from '../../src/web/streamers/stream-array.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('streamArray (web): streams array items', async (t, resolve, reject) => {
  try {
    const pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']];
    const out = await runWebChain([streamArray.withParserAsWebStream()], [JSON.stringify(pattern)]);
    const result = [];
    for (const o of out) result[o.key] = o.value;
    t.deepEqual(result, pattern, 'each array item streamed in order');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('streamArray (web): errors on non-array root', async (t, resolve) => {
  try {
    await runWebChain([streamArray.withParserAsWebStream()], [' true ']);
    t.fail('expected an error for non-array root');
  } catch (e) {
    t.ok(e, 'error surfaced for non-array root');
  }
  resolve();
});
