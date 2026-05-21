import test from 'tape-six';

import pick from '../../src/web/filters/pick.js';

import {runWebChain} from '../web-helpers.js';

test.asPromise('pick (web): pick via stack depth', async (t, resolve, reject) => {
  try {
    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}, {f: {f: true}}];
    const out = await runWebChain(
      [
        pick.withParserAsWebStream({
          packValues: false,
          filter: stack => stack.length === 2
        })
      ],
      [JSON.stringify(input)]
    );
    const names = out.map(t => t.name);
    t.deepEqual(names, [
      'startObject',
      'endObject',
      'startArray',
      'endArray',
      'nullValue',
      'startNumber',
      'numberChunk',
      'endNumber',
      'startString',
      'stringChunk',
      'endString',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'trueValue',
      'endObject'
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});
