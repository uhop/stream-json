import {Flushable, Many, none} from 'stream-chain/defs.js';

import type {Token as BaseToken} from '../parser.js';

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
declare function parser(options?: parser.JsoncParserOptions): Flushable<string, Many<parser.Token> | typeof none>;

declare namespace parser {
  /**
   * A single token emitted by the JSONC parser. Extends the base JSON `Token`
   * with `comment` — single-line (`//`) and block (`/* ... *​/`) comments
   * surfaced when `streamComments` is set — and `comma`, a valueless marker
   * emitted at every comma's position when `streamCommas` is set.
   */
  export type Token = BaseToken | {name: 'comment'; value: string} | {name: 'comma'};
  /** Alias of `Token` — disambiguates when both JSON and JSONC tokens are imported. */
  export type JsoncToken = Token;

  /** Closed set of JSONC token-type names. Equivalent to `Token['name']`. */
  export type TokenName = Token['name'];
  /** Alias of `TokenName` — disambiguates when both JSON and JSONC names are imported. */
  export type JsoncTokenName = TokenName;

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
    /**
     * Emit a valueless `comma` token at the position of every comma (separator
     * or trailing), so a parse → stringify round-trip can reproduce comma
     * placement faithfully. The JSONC stringer renders it back as `,` when its
     * `useCommas` option is set. Default: `false` — commas are accepted but not
     * surfaced as tokens (the stringer auto-inserts separators).
     */
    streamCommas?: boolean;
  }

  /** Self-reference for backwards compat: `import {parser} from 'stream-json/core/jsonc/parser.js'`. */
  export const parser: typeof import('./parser.js').default;
}

type JsoncToken = parser.JsoncToken;
type JsoncTokenName = parser.JsoncTokenName;
type JsoncParserOptions = parser.JsoncParserOptions;

export default parser;
export {parser};
export type {JsoncToken, JsoncTokenName, JsoncParserOptions};
