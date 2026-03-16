/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';

export = parser;

/**
 * Creates a streaming JSON parser that consumes text and produces a SAX-like token stream.
 *
 * Supports both standard JSON and JSON Streaming (concatenated/line-delimited).
 * Individual keys, strings, and numbers can be streamed piece-wise or packed into single tokens.
 *
 * @param options - Parser configuration including packing, streaming, and JSON streaming options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function parser(options?: parser.ParserOptions): Flushable<string, Many<parser.Token> | typeof none>;

declare namespace parser {
  /** A single token emitted by the parser (e.g., `startObject`, `stringValue`). */
  export interface Token {
    /** Token type name (e.g., `'startObject'`, `'keyValue'`, `'numberValue'`). */
    name: string;
    /** Token payload. Present for value tokens; `undefined` for structural tokens. */
    value?: any;
  }

  /** Options for the JSON parser. Extends Node.js `DuplexOptions`. */
  export interface ParserOptions extends DuplexOptions {
    /** Initial value for `packKeys`, `packStrings`, and `packNumbers`. */
    packValues?: boolean;
    /** Pack object keys into `keyValue` tokens. Default: `true`. */
    packKeys?: boolean;
    /** Pack strings into `stringValue` tokens. Default: `true`. */
    packStrings?: boolean;
    /** Pack numbers into `numberValue` tokens. Default: `true`. */
    packNumbers?: boolean;
    /** Initial value for `streamKeys`, `streamStrings`, and `streamNumbers`. */
    streamValues?: boolean;
    /** Emit `startKey`/`endKey`/`stringChunk` tokens for keys. Default: `true`. */
    streamKeys?: boolean;
    /** Emit `startString`/`endString`/`stringChunk` tokens for strings. Default: `true`. */
    streamStrings?: boolean;
    /** Emit `startNumber`/`endNumber`/`numberChunk` tokens for numbers. Default: `true`. */
    streamNumbers?: boolean;
    /** Enable JSON Streaming (concatenated/line-delimited JSON). Default: `false`. */
    jsonStreaming?: boolean;
  }

  /**
   * Creates a parser wrapped as a Duplex stream.
   *
   * Writable side accepts text (Buffer/string), readable side emits token objects.
   */
  export function asStream(options?: ParserOptions): Duplex;
  /** Self-reference for destructuring: `const {parser} = require('stream-json/parser.js')`. */
  export {parser};
}
