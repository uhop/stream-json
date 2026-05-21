import test from 'tape-six';

import jsonlParser from '../../src/web/jsonl/parser.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('jsonlParser (web): parses JSONL into values', async (t, resolve, reject) => {
  try {
    const values = [{a: 1}, {b: 2}, [1, 2, 3], null, true, false, 42];
    const input = values.map(v => JSON.stringify(v)).join('\n') + '\n';
    const out = await runWebChain([jsonlParser.asWebStream()], [input]);
    const got = out.map(o => o.value);
    t.deepEqual(got, values, 'each JSONL line decoded');
    resolve();
  } catch (e) {
    reject(e);
  }
});
