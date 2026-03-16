import type {Duplex} from 'node:stream';

import test from 'tape-six';
import parser from '../src/parser.js';
import emit from '../src/utils/emit.js';
import withParser from '../src/utils/with-parser.js';
import Batch from '../src/utils/batch.js';
import Verifier from '../src/utils/verifier.js';
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

test('types: Batch', t => {
  const b1: Batch = Batch.make();
  t.ok(b1);

  const b2: Batch = Batch.make({batchSize: 10});
  t.ok(b2);

  const b3: Batch = new Batch({batchSize: 5});
  t.ok(b3);

  const b4: Batch = Batch.batch({batchSize: 100});
  t.ok(b4);

  const size: number = b1._batchSize;
  t.equal(typeof size, 'number');

  const opts: Batch.BatchOptions = {batchSize: 50};
  t.ok(opts);
});

test('types: Verifier', t => {
  const v1: Verifier = Verifier.make();
  t.ok(v1);

  const v2: Verifier = Verifier.make({jsonStreaming: true});
  t.ok(v2);

  const v3: Verifier = new Verifier();
  t.ok(v3);

  const v4: Verifier = Verifier.verifier();
  t.ok(v4);

  const opts: Verifier.VerifierOptions = {jsonStreaming: false};
  t.ok(opts);

  const err: Verifier.VerifierError = Object.assign(new Error('test'), {line: 1, pos: 5, offset: 4});
  t.ok(err);
});

test('types: Utf8Stream', t => {
  const u1: Utf8Stream = new Utf8Stream();
  t.ok(u1);

  const u2: Utf8Stream = new Utf8Stream({highWaterMark: 1024});
  t.ok(u2);
});
