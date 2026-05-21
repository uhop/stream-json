import type {ParserOptions as CoreParserOptions, Token as CoreToken} from '../core/parser.js';

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

  /** Options for the JSON parser. */
  export type ParserOptions = CoreParserOptions;

  /** Creates a parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for backwards compat. */
  export const parser: typeof import('./parser.js').default;
}

type Token = parser.Token;
type ParserOptions = parser.ParserOptions;

export default parser;
export {parser};
export type {Token, ParserOptions};
