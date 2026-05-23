/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import type {JsoncParserOptions as CoreJsoncParserOptions, JsoncToken as CoreJsoncToken, JsoncTokenName as CoreJsoncTokenName} from '../core/jsonc/parser.js';

/**
 * Creates a streaming JSONC parser that consumes text and produces a SAX-like token stream.
 *
 * Node-flavored entry: the returned factory has both `jsoncParser.asStream(options)`
 * (Node Duplex) and `jsoncParser.asWebStream(options)` (Web `{readable, writable}` pair) attached.
 *
 * @param options - Parser configuration including packing, streaming, comment, and whitespace options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function jsoncParser(options?: jsoncParser.JsoncParserOptions): ReturnType<typeof import('../core/jsonc/parser.js').default>;

declare namespace jsoncParser {
  /** A single token emitted by the parser (e.g., `startObject`, `whitespace`, `comment`). */
  export type Token = CoreJsoncToken;
  /** Alias of `Token` — disambiguates when both JSON and JSONC tokens are imported. */
  export type JsoncToken = Token;
  /** Closed set of JSONC token-type names. Equivalent to `Token['name']`. */
  export type TokenName = CoreJsoncTokenName;
  /** Alias of `TokenName` — disambiguates when both JSON and JSONC names are imported. */
  export type JsoncTokenName = TokenName;
  /** Options for the JSONC parser. Extends Node.js `DuplexOptions`. */
  export interface JsoncParserOptions extends CoreJsoncParserOptions, DuplexOptions {}
  /** Creates a JSONC parser wrapped as a Node Duplex stream. */
  export function asStream(options?: JsoncParserOptions): Duplex;
  /** Creates a JSONC parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: JsoncParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `jsoncParser.jsoncParser === jsoncParser`. */
  export const jsoncParser: typeof import('./parser.js').default;
  /** Self-reference for `jsoncParser.parser === jsoncParser`. */
  export const parser: typeof import('./parser.js').default;
}

type JsoncToken = jsoncParser.JsoncToken;
type JsoncTokenName = jsoncParser.JsoncTokenName;
type JsoncParserOptions = jsoncParser.JsoncParserOptions;

export default jsoncParser;
export {jsoncParser, jsoncParser as parser};
export type {JsoncToken, JsoncTokenName, JsoncParserOptions};
