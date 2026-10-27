import test from 'tape-six';
import {chain} from 'stream-chain/web';

import parser from '../../src/web/parser.js';
import verifier from '../../src/web/utils/verifier.js';
import jsoncParser from '../../src/web/jsonc/parser.js';
import jsoncVerifier from '../../src/web/jsonc/verifier.js';

import {readWebString, drain} from '../web-helpers.js';

const BOM = '﻿';
const doc = '{"a":1}';
const splitBOM = () => [Uint8Array.of(0xef), Uint8Array.of(0xbb), Uint8Array.of(0xbf), new TextEncoder().encode(doc)];

const values = tokens => tokens.filter(token => token.name === 'keyValue' || token.name === 'numberValue').map(token => token.value);

for (const [name, make] of [
  ['parser', parser],
  ['jsonc parser', jsoncParser]
]) {
  test(`${name} (web): drops a leading BOM`, async t => {
    t.deepEqual(values(await drain(chain([readWebString(BOM + doc), make()]))), ['a', '1']);
  });

  test(`${name} (web): drops a leading BOM split over byte chunks`, async t => {
    t.deepEqual(values(await drain(chain([readWebString(splitBOM()), make()]))), ['a', '1']);
  });

  test(`${name} (web): keeps a leading BOM with ignoreBOM`, async t => {
    await t.rejects(drain(chain([readWebString(BOM + doc), make({ignoreBOM: true})])));
  });

  test(`${name} (web): drops one leading U+FEFF, not two`, async t => {
    await t.rejects(drain(chain([readWebString(BOM + BOM + doc), make()])));
  });
}

for (const [name, make] of [
  ['verifier', verifier],
  ['jsonc verifier', jsoncVerifier]
]) {
  test(`${name} (web): drops a leading BOM`, async t => {
    await t.resolves(drain(chain([readWebString(BOM + doc), make()])));
  });

  test(`${name} (web): drops a leading BOM split over byte chunks`, async t => {
    await t.resolves(drain(chain([readWebString(splitBOM()), make()])));
  });

  test(`${name} (web): keeps a leading BOM with ignoreBOM`, async t => {
    await t.rejects(drain(chain([readWebString(BOM + doc), make({ignoreBOM: true})])));
  });

  test(`${name} (web): drops one leading U+FEFF, not two`, async t => {
    await t.rejects(drain(chain([readWebString(BOM + BOM + doc), make()])));
  });
}
