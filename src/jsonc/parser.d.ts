/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';

export = jsoncParser;

/**
 * Creates a streaming JSONC parser that consumes text and produces a SAX-like token stream.
 *
 * Extends the standard JSON parser with support for single-line (`//`) and multi-line
 * (`/* ... *​/`) comments, trailing commas, and optional whitespace tokens.
 *
 * @param options - Parser configuration including packing, streaming, comment, and whitespace options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function jsoncParser(options?: jsoncParser.JsoncParserOptions): Flushable<string, Many<jsoncParser.Token> | typeof none>;

declare namespace jsoncParser {
  /** A single token emitted by the parser (e.g., `startObject`, `whitespace`, `comment`). */
  export interface Token {
    /** Token type name (e.g., `'startObject'`, `'whitespace'`, `'comment'`). */
    name: string;
    /** Token payload. Present for value, whitespace, and comment tokens; `undefined` for structural tokens. */
    value?: any;
  }

  /** Options for the JSONC parser. Extends Node.js `DuplexOptions`. */
  export interface JsoncParserOptions extends DuplexOptions {
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
    /** Emit `whitespace` tokens. Default: `true`. */
    streamWhitespace?: boolean;
    /** Emit `comment` tokens. Default: `true`. */
    streamComments?: boolean;
  }

  /**
   * Creates a JSONC parser wrapped as a Duplex stream.
   *
   * Writable side accepts text (Buffer/string), readable side emits token objects.
   */
  export function asStream(options?: JsoncParserOptions): Duplex;
  /** Self-reference for destructuring: `const {parser} = require('stream-json/jsonc/parser.js')`. */
  export {jsoncParser as parser};
  /** Self-reference for destructuring: `const {jsoncParser} = require('stream-json/jsonc/parser.js')`. */
  export {jsoncParser};
}
