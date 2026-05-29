import type {JsonlParserOptions as CoreJsonlParserOptions, JsonlItem as CoreJsonlItem} from '../../core/jsonl/parser.js';

/**
 * Creates a JSONL (line-delimited JSON) parser as a generator pipeline.
 *
 * Web-flavored entry: the returned factory has only `parser.asWebStream(options)` attached.
 *
 * @deprecated Use stream-chain's JSONL parser directly: `stream-chain/jsonl/parserWebStream.js`
 * (Web `{readable, writable}` pair) or `stream-chain/jsonl/parser.js` (pure factory). stream-json's
 * JSONL is now a thin re-export of stream-chain 4.2.0+ and is slated for removal in a future major —
 * stream-json is a JSON *token* library, whereas JSONL yields whole objects per line and belongs
 * in stream-chain with the other substrate components.
 *
 * @param options - Parser configuration including reviver and error handling.
 * @returns A generator pipeline function for use in a `chain()` pipeline.
 */
declare function parser<T = unknown>(options?: parser.JsonlParserOptions): ReturnType<typeof import('../../core/jsonl/parser.js').default<T>>;

declare namespace parser {
  /** Options for the JSONL parser. */
  export type JsonlParserOptions = CoreJsonlParserOptions;
  /** An item emitted by the JSONL parser. Generic in `T` — declare `JsonlItem<MyRow>` to type `value`. */
  export type JsonlItem<T = unknown> = CoreJsonlItem<T>;
  /** Creates a JSONL parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: JsonlParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Parses a single JSON line, returning the parsed value or `errorIndicator` on failure. */
  export function checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: unknown): any;
  /** Self-reference for backwards compat. */
  export const parser: typeof import('./parser.js').default;
}

type JsonlParserOptions = parser.JsonlParserOptions;
type JsonlItem<T = unknown> = parser.JsonlItem<T>;
/**
 * Top-level alias of `parser.checkedParse` — re-exported for direct
 * import: `import {checkedParse} from 'stream-json/web/jsonl/parser.js'`.
 *
 * Parses a single JSON line and returns the parsed value, or the
 * `errorIndicator` (or its return value) on a parse failure.
 *
 * @param input - A JSON string to parse.
 * @param reviver - Optional `JSON.parse()` reviver.
 * @param errorIndicator - Fallback on parse error. If a function, called as
 * `errorIndicator(error, input, reviver)` and its return value is used; otherwise
 * the value itself is returned. If omitted, parse errors propagate.
 * @returns The parsed value, or the `errorIndicator` fallback.
 */
declare function checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: unknown): any;
/**
 * Top-level alias of the core `jsonlParser` — the raw per-line parser factory with
 * no `fixUtf8Stream()` / line-splitting front. Re-exported for direct import:
 * `import {jsonlParser} from 'stream-json/web/jsonl/parser.js'`.
 */
declare const jsonlParser: typeof import('../../core/jsonl/parser.js').jsonlParser;

export default parser;
export {parser, jsonlParser, checkedParse};
export type {JsonlParserOptions, JsonlItem};
