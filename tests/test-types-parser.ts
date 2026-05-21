import type {Duplex} from 'node:stream';
import type {Flushable, Many} from 'stream-chain/defs.js';
import {none} from 'stream-chain/defs.js';

import test from 'tape-six';
import parser from '../src/parser.js';

test('types: parser()', t => {
  const fn = parser();
  t.equal(typeof fn, 'function');

  const fnWithOpts = parser({packKeys: true, packStrings: false, jsonStreaming: true});
  t.equal(typeof fnWithOpts, 'function');
});

test('types: parser.asStream()', t => {
  const stream: Duplex = parser.asStream();
  t.ok(stream);

  const streamWithOpts: Duplex = parser.asStream({packValues: false, streamNumbers: true});
  t.ok(streamWithOpts);
});

test('types: Token interface', t => {
  const token: parser.Token = {name: 'startObject'};
  t.equal(token.name, 'startObject');

  const tokenWithValue: parser.Token = {name: 'stringValue', value: 'hello'};
  t.equal(tokenWithValue.value, 'hello');
});

test('types: ParserOptions interface', t => {
  const opts: parser.ParserOptions = {
    packValues: true,
    packKeys: true,
    packStrings: true,
    packNumbers: true,
    streamValues: false,
    streamKeys: false,
    streamStrings: false,
    streamNumbers: false,
    jsonStreaming: true
  };
  t.ok(opts);
});

test('types: parser re-export', t => {
  const p: typeof parser = parser.parser;
  t.equal(p, parser);
});
