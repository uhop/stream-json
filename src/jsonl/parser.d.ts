/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import type {JsonlParserOptions as CoreJsonlParserOptions, JsonlItem as CoreJsonlItem} from '../core/jsonl/parser.js';

/**
 * Creates a JSONL (line-delimited JSON) parser as a generator pipeline.
 *
 * Node-flavored entry: the returned factory has both `parser.asStream(options)`
 * (Node Duplex) and `parser.asWebStream(options)` (Web `{readable, writable}` pair) attached.
 *
 * @deprecated Use stream-chain's JSONL parser directly: `stream-chain/jsonl/parserStream.js`
 * (Node Duplex) or `stream-chain/jsonl/parser.js` (pure factory). stream-json's JSONL is
 * now a thin re-export of stream-chain 4.2.0+ and is slated for removal in a future major —
 * stream-json is a JSON *token* library, whereas JSONL yields whole objects per line and
 * belongs in stream-chain with the other substrate components.
 *
 * @param options - Parser configuration including reviver and error handling.
 * @returns A generator pipeline function for use in a `chain()` pipeline.
 */
declare function parser<T = unknown>(options?: parser.JsonlParserOptions): ReturnType<typeof import('../core/jsonl/parser.js').default<T>>;

declare namespace parser {
  /** Options for the JSONL parser. Extends Node.js `DuplexOptions`. */
  export interface JsonlParserOptions extends CoreJsonlParserOptions, DuplexOptions {}
  /** An item emitted by the JSONL parser. Generic in `T` — declare `JsonlItem<MyRow>` to type `value`. */
  export type JsonlItem<T = unknown> = CoreJsonlItem<T>;
  /** Creates a JSONL parser wrapped as a Node Duplex stream. */
  export function asStream(options?: JsonlParserOptions): Duplex;
  /** Creates a JSONL parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: JsonlParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for backwards compat. */
  export const parser: typeof import('./parser.js').default;
}

type JsonlParserOptions = parser.JsonlParserOptions;
type JsonlItem<T = unknown> = parser.JsonlItem<T>;
/**
 * Top-level alias of the core `jsonlParser` — the raw per-line parser factory with
 * no `fixUtf8Stream()` / line-splitting front. Re-exported for direct import:
 * `import {jsonlParser} from 'stream-json/jsonl/parser.js'`.
 */
declare const jsonlParser: typeof import('../core/jsonl/parser.js').jsonlParser;

export default parser;
export {parser, jsonlParser};
export type {JsonlParserOptions, JsonlItem};
