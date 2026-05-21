import test from 'tape-six';

import ignore from '../../src/web/filters/ignore.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('ignore (web): drops matching subtrees', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const out = await runWebChain([ignore.withParserAsWebStream({packValues: false, filter: /^b$/})], [input]);
    const names = out.map(t => t.name);
    t.ok(!names.includes('trueValue'), 'true value (under "b") was dropped');
    t.ok(names.includes('startArray'), '"c" subtree retained');
    resolve();
  } catch (e) {
    reject(e);
  }
});
