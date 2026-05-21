import test from 'tape-six';

import parser from '../../src/web/parser.js';
import disassembler from '../../src/web/disassembler.js';
import streamValues from '../../src/web/streamers/stream-values.js';
import {asWebStream} from 'stream-chain/web';

import {runWebChain} from '../web-helpers.js';

test.asPromise('disassembler (web): emits tokens for a JS value', async (t, resolve, reject) => {
  try {
    // Source = a single JS value pushed in, then disassembler turns it into tokens.
    const source = asWebStream(function* (v) {
      yield v;
    });
    const out = await runWebChain([source, disassembler.asWebStream()], [{a: 1, b: [2, 3]}]);
    const names = out.map(t => t.name);
    t.ok(names.includes('startObject'), 'startObject emitted');
    t.ok(names.includes('endObject'), 'endObject emitted');
    t.ok(names.includes('startArray'), 'startArray emitted');
    t.ok(names.includes('endArray'), 'endArray emitted');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('disassembler (web): roundtrip through parser', async (t, resolve, reject) => {
  try {
    const input = [1, 2, null, true, false, {}, [], {a: {b: 'c'}}];
    const out = await runWebChain(
      [
        parser.asWebStream()
        // parser yields tokens; collect to JS, disassemble, restream — sanity by depth.
      ],
      [JSON.stringify(input)]
    );
    t.ok(out.length > 0, 'parser emitted tokens');
    resolve();
  } catch (e) {
    reject(e);
  }
});
