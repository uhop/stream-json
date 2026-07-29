import type {
  ParserOptions as CoreParserOptions,
  Token as CoreToken,
  TokenName as CoreTokenName,
  TokenSource as CoreTokenSource,
  TokenTransform as CoreTokenTransform,
  TokenConsumer as CoreTokenConsumer,
  TokenStringer as CoreTokenStringer
} from '../core/parser.js';

/**
 * Creates a streaming JSON parser that consumes text and produces a SAX-like token stream.
 *
 * Web-flavored entry: the returned factory has only `parser.asWebStream(options)`
 * attached. No Node-stream imports are pulled in via this subpath.
 *
 * @param options - Parser configuration including packing, streaming, and JSON streaming options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function parser(options?: parser.ParserOptions): ReturnType<typeof import('../core/parser.js').default>;

declare namespace parser {
  /** A single token emitted by the parser. */
  export type Token = CoreToken;
  /** Closed set of token-type names. Equivalent to `Token['name']`. */
  export type TokenName = CoreTokenName;
  /** Stage shape of the parser: `text` → `tokens`. */
  export type TokenSource = CoreTokenSource;
  /** Stage shape of the filters: `tokens` → `tokens`. */
  export type TokenTransform = CoreTokenTransform;
  /** Stage shape of the streamers: `tokens` → items (see `KeyedValue` in `streamers/stream-base`). */
  export type TokenConsumer<Item = unknown> = CoreTokenConsumer<Item>;
  /** Stage shape of the stringers: `tokens` → `text`. */
  export type TokenStringer = CoreTokenStringer;

  /** Options for the JSON parser. */
  export type ParserOptions = CoreParserOptions;

  /** Creates a parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for backwards compat. */
  export const parser: typeof import('./parser.js').default;
}

type Token = parser.Token;
type TokenName = parser.TokenName;
type ParserOptions = parser.ParserOptions;
type TokenSource = parser.TokenSource;
type TokenTransform = parser.TokenTransform;
type TokenConsumer<Item = unknown> = parser.TokenConsumer<Item>;
type TokenStringer = parser.TokenStringer;

export default parser;
export {parser};
export type {Token, TokenName, ParserOptions, TokenSource, TokenTransform, TokenConsumer, TokenStringer};
