import test from 'tape-six';

import jsoncParser from '../../src/web/jsonc/parser.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('jsoncParser (web): tolerates // comments + trailing commas', async (t, resolve, reject) => {
  try {
    const input = `{
      // line comment
      "a": 1, /* block comment */
      "b": [1, 2, 3,], // trailing comma
    }`;
    const out = await runWebChain([jsoncParser.asWebStream()], [input]);
    const names = out.map(t => t.name);
    t.ok(names.includes('startObject'), 'parsed object opening');
    t.ok(names.includes('endObject'), 'parsed object closing');
    t.ok(names.includes('startArray'), 'parsed array opening');
    t.ok(names.includes('endArray'), 'parsed array closing');
    resolve();
  } catch (e) {
    reject(e);
  }
});
