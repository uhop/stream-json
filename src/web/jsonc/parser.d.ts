import type {JsoncParserOptions as CoreJsoncParserOptions, JsoncToken as CoreJsoncToken} from '../../core/jsonc/parser.js';

/**
 * Creates a streaming JSONC parser that consumes text and produces a SAX-like token stream.
 *
 * Web-flavored entry: the returned factory has only `jsoncParser.asWebStream(options)` attached.
 *
 * @param options - Parser configuration including packing, streaming, comment, and whitespace options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function jsoncParser(options?: jsoncParser.JsoncParserOptions): ReturnType<typeof import('../../core/jsonc/parser.js').default>;

declare namespace jsoncParser {
  /** A single token emitted by the parser (e.g., `startObject`, `whitespace`, `comment`). */
  export type Token = CoreJsoncToken;
  /** Options for the JSONC parser. */
  export type JsoncParserOptions = CoreJsoncParserOptions;
  /** Creates a JSONC parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: JsoncParserOptions): {readable: ReadableStream; writable: WritableStream};
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
