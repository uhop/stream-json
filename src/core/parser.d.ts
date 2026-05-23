import {Flushable, Many, none} from 'stream-chain/defs.js';

/**
 * Creates a streaming JSON parser that consumes text and produces a SAX-like token stream.
 *
 * Supports both standard JSON and JSON Streaming (concatenated/line-delimited).
 * Individual keys, strings, and numbers can be streamed piece-wise or packed into single tokens.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/parser.js`; for the Web-only entry import from
 * `stream-json/web/parser.js`.
 *
 * @param options - Parser configuration including packing, streaming, and JSON streaming options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function parser(options?: parser.ParserOptions): Flushable<string, Many<parser.Token> | typeof none>;

declare namespace parser {
  /**
   * A single token emitted by the parser. Discriminated union over `name` —
   * narrowing on `chunk.name` in a `switch` block tightens `chunk.value` per arm.
   *
   * `whitespace` is reserved in the protocol (the JSONC parser emits it; the
   * JSON parser does not today, but historically did and may again).
   */
  export type Token =
    | {name: 'startObject'}
    | {name: 'endObject'}
    | {name: 'startArray'}
    | {name: 'endArray'}
    | {name: 'startKey'}
    | {name: 'endKey'}
    | {name: 'startString'}
    | {name: 'endString'}
    | {name: 'startNumber'}
    | {name: 'endNumber'}
    | {name: 'keyValue'; value: string}
    | {name: 'stringChunk'; value: string}
    | {name: 'stringValue'; value: string}
    | {name: 'numberChunk'; value: string}
    | {name: 'numberValue'; value: string}
    | {name: 'nullValue'; value: null}
    | {name: 'trueValue'; value: true}
    | {name: 'falseValue'; value: false}
    | {name: 'whitespace'; value: string};

  /** Closed set of token-type names. Equivalent to `Token['name']`. */
  export type TokenName = Token['name'];

  /** Options for the JSON parser. */
  export interface ParserOptions {
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

  /** Self-reference for backwards compat: `import {parser} from 'stream-json/core/parser.js'`. */
  export const parser: typeof import('./parser.js').default;
}

type Token = parser.Token;
type TokenName = parser.TokenName;
type ParserOptions = parser.ParserOptions;

export default parser;
export {parser};
export type {Token, TokenName, ParserOptions};
