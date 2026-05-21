import test from 'tape-six';

import jsoncVerifier from '../../src/web/jsonc/verifier.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('jsoncVerifier (web): accepts JSONC with comments + trailing commas', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, /* note */ "b": [1, 2, 3,] }';
    const out = await runWebChain([jsoncVerifier.asWebStream()], [input]);
    t.deepEqual(out, [], 'verifier is a sink — no output emitted on success');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsoncVerifier (web): rejects malformed JSONC', async (t, resolve) => {
  try {
    await runWebChain([jsoncVerifier.asWebStream()], ['{a:1}']);
    t.fail('expected an error for unquoted key');
  } catch (e) {
    t.ok(e, 'error surfaced');
  }
  resolve();
});
