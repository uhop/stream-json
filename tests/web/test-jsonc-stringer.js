import test from 'tape-six';

import jsoncParser from '../../src/web/jsonc/parser.js';
import jsoncStringer from '../../src/web/jsonc/stringer.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('jsoncStringer (web): roundtrip preserves payload', async (t, resolve, reject) => {
  try {
    const input = '{"a":1,"b":[1,2,3]}';
    const out = await runWebChain([jsoncParser.asWebStream(), jsoncStringer.asWebStream()], [input]);
    t.equal(out.join(''), input, 'roundtrip preserved');
    resolve();
  } catch (e) {
    reject(e);
  }
});
