import type {Duplex} from 'node:stream';

import test from 'tape-six';
import parser from '../src/parser.js';
import emit from '../src/utils/emit.js';
import withParser from '../src/utils/with-parser.js';
import batch from '../src/utils/batch.js';
import verifier from '../src/utils/verifier.js';
import Utf8Stream from '../src/utils/utf8-stream.js';

test('types: emit', t => {
  const stream = parser.asStream();
  const emitted: typeof stream = emit(stream);
  t.ok(emitted);
  t.equal(emitted, stream);
});

test('types: withParser', t => {
  const wp = withParser((opts?: any) => () => {}, {packKeys: true});
  t.equal(typeof wp, 'function');

  const wpStream: Duplex = withParser.asStream((opts?: any) => () => {}, {packValues: true});
  t.ok(wpStream);
});

test('types: batch', t => {
  const fn = batch();
  t.ok(typeof fn === 'function');

  const b1: batch.BatchStream = batch.asStream();
  t.ok(b1);

  const b2: batch.BatchStream = batch.asStream({batchSize: 10});
  t.ok(b2);

  const b3 = batch.batch({batchSize: 100});
  t.equal(typeof b3, 'function');

  const size: number = b1._batchSize;
  t.equal(typeof size, 'number');

  const opts: batch.BatchOptions = {batchSize: 50};
  t.ok(opts);
});

test('types: verifier', t => {
  const fn = verifier();
  t.equal(typeof fn, 'function');

  const v1: Duplex = verifier.asStream();
  t.ok(v1);

  const v2: Duplex = verifier.asStream({jsonStreaming: true});
  t.ok(v2);

  const v3 = verifier.verifier();
  t.equal(typeof v3, 'function');

  const opts: verifier.VerifierOptions = {jsonStreaming: false};
  t.ok(opts);

  const err: verifier.VerifierError = Object.assign(new Error('test'), {line: 1, pos: 5, offset: 4});
  t.ok(err);
});

test('types: Utf8Stream', t => {
  const u1: Utf8Stream = new Utf8Stream();
  t.ok(u1);

  const u2: Utf8Stream = new Utf8Stream({highWaterMark: 1024});
  t.ok(u2);
});
