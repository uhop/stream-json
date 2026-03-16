import {Duplex, DuplexOptions} from 'node:stream';
import {Readable} from 'node:stream';
import chain from 'stream-chain';
import {Flushable, Many, none} from 'stream-chain/defs.js';

import parser from '../src/parser.js';

// parser() returns a Flushable
const fn = parser();
const fnWithOpts = parser({packKeys: true, packStrings: false, jsonStreaming: true});

// parser.asStream() returns a Duplex
const stream: Duplex = parser.asStream();
const streamWithOpts: Duplex = parser.asStream({packValues: false, streamNumbers: true});

// Token interface
const token: parser.Token = {name: 'startObject'};
const tokenWithValue: parser.Token = {name: 'stringValue', value: 'hello'};

// ParserOptions interface
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

// re-export
const p: typeof parser = parser.parser;
