import test from 'tape-six';

import parser from '../../src/web/parser.js';
import stringer from '../../src/web/stringer.js';

import {runWebChain} from '../web-helpers.js';

const pattern = {
  a: [[[]]],
  b: {a: 1},
  c: {a: 1, b: 2},
  d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
  e: 1,
  f: '',
  g: true,
  h: false,
  i: null,
  j: [],
  k: {}
};

test.asPromise('stringer (web): roundtrip', async (t, resolve, reject) => {
  try {
    const string = JSON.stringify(pattern);
    const out = await runWebChain([parser.asWebStream(), stringer.asWebStream()], [string]);
    t.equal(out.join(''), string, 'roundtrip output matches input');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): no packing', async (t, resolve, reject) => {
  try {
    const string = JSON.stringify(pattern);
    const out = await runWebChain([parser.asWebStream({packValues: false}), stringer.asWebStream()], [string]);
    t.equal(out.join(''), string, 'roundtrip output matches input under packValues:false');
    resolve();
  } catch (e) {
    reject(e);
  }
});
