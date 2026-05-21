import test from 'tape-six';

import streamArray from '../../src/web/streamers/stream-array.js';
import batch from '../../src/web/utils/batch.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('batch (web): batches array items', async (t, resolve, reject) => {
  try {
    const pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']];
    const out = await runWebChain([streamArray.withParserAsWebStream(), batch.asWebStream({batchSize: 2})], [JSON.stringify(pattern)]);
    t.ok(out.length >= 4, 'multiple batches emitted');
    out.forEach(b => t.ok(b.length === 2 || b.length === 1, 'each batch ≤ batchSize'));
    const flat = out.flat();
    const result = [];
    for (const o of flat) result[o.key] = o.value;
    t.deepEqual(result, pattern, 'flattened batches reconstruct full input');
    resolve();
  } catch (e) {
    reject(e);
  }
});
