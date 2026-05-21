import test from 'tape-six';

import verifier from '../../src/web/utils/verifier.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('verifier (web): accepts a valid JSON array', async (t, resolve, reject) => {
  try {
    const out = await runWebChain([verifier.asWebStream()], ['[1,2,3]']);
    t.deepEqual(out, [], 'verifier is a sink — no output emitted on success');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('verifier (web): jsonStreaming accepts space-separated values', async (t, resolve, reject) => {
  try {
    const out = await runWebChain([verifier.asWebStream({jsonStreaming: true})], ['1 2 3']);
    t.deepEqual(out, [], 'verifier completed without emitting tokens');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('verifier (web): rejects invalid JSON', async (t, resolve) => {
  try {
    await runWebChain([verifier.asWebStream()], ['{invalid']);
    t.fail('expected an error for invalid JSON');
  } catch (e) {
    t.ok(e, 'error surfaced');
  }
  resolve();
});
