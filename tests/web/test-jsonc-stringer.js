// Mirror of the jsonc stringer scenarios from tests/node/test-jsonc.js.
// See tests/web/test-stringer.js for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import jsoncParser from '../../src/web/jsonc/parser.js';
import jsoncStringer from '../../src/web/jsonc/stringer.js';

import {readWebString, drain} from '../web-helpers.js';

const roundTrip = async (input, options, quant) => {
  const pipeline = chain([readWebString(input, quant), jsoncParser(options), jsoncStringer()]);
  const out = await drain(pipeline);
  return out.join('');
};

test.asPromise('jsonc stringer (web): standard JSON', async (t, resolve, reject) => {
  try {
    const result = await roundTrip('{"a":1,"b":true}');
    t.equal(result, '{"a":1,"b":true}');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc stringer (web): preserves comments', async (t, resolve, reject) => {
  try {
    const input = '{"a":1,// line comment\n"b":2}';
    const result = await roundTrip(input);
    t.ok(result.includes('// line comment\n'));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc stringer (web): preserves block comments', async (t, resolve, reject) => {
  try {
    const input = '{"a":/* comment */1}';
    const result = await roundTrip(input);
    t.ok(result.includes('/* comment */'));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc stringer (web): preserves whitespace', async (t, resolve, reject) => {
  try {
    const input = '{\n  "a": 1\n}';
    const result = await roundTrip(input, {streamWhitespace: false});
    t.equal(result, '{"a":1}');
    resolve();
  } catch (e) {
    reject(e);
  }
});
