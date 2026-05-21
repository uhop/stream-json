import test from 'tape-six';

import streamValues from '../../src/web/streamers/stream-values.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('streamValues (web): streams top-level JSON values', async (t, resolve, reject) => {
  try {
    const pattern = [1, 2, 3, true, false, '', 'Abc', [], [1], {}, {a: 1}];
    const out = await runWebChain([streamValues.withParserAsWebStream()], [pattern.map(v => JSON.stringify(v)).join(' ')]);
    const result = [];
    for (const o of out) result[o.key] = o.value;
    t.deepEqual(result, pattern, 'each top-level value streamed in order');
    resolve();
  } catch (e) {
    reject(e);
  }
});
