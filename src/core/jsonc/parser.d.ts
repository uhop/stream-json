import {Flushable, Many, none} from 'stream-chain/defs.js';

/**
 * Creates a streaming JSONC parser that consumes text and produces a SAX-like token stream.
 *
 * Extends the standard JSON parser with support for single-line (`//`) and multi-line
 * (`/* ... *​/`) comments, trailing commas, and optional whitespace tokens.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/jsonc/parser.js`; for the Web-only entry import from
 * `stream-json/web/jsonc/parser.js`.
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

  /** Options for the JSONC parser. */
  export interface JsoncParserOptions {
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

  /** Self-reference for `jsoncParser.jsoncParser === jsoncParser`. */
  export const jsoncParser: typeof import('./parser.js').default;
  /** Self-reference for `jsoncParser.parser === jsoncParser`. */
  export const parser: typeof import('./parser.js').default;
}

type JsoncToken = jsoncParser.Token;
type JsoncParserOptions = jsoncParser.JsoncParserOptions;

export default jsoncParser;
export {jsoncParser, jsoncParser as parser};
export type {JsoncToken, JsoncParserOptions};
