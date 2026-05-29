/**
 * Creates a JSONL (line-delimited JSON) parser as a generator pipeline.
 *
 * Each line is parsed with `JSON.parse()`. Faster than the equivalent
 * `parser({jsonStreaming: true}) + streamValues()` when individual items fit in memory.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/jsonl/parser.js`; for the Web-only entry import from
 * `stream-json/web/jsonl/parser.js`.
 *
 * @deprecated Use stream-chain's JSONL parser directly: `stream-chain/jsonl/parser.js`
 * (pure factory) or `stream-chain/jsonl/parserStream.js` (Node Duplex). stream-json's
 * JSONL is now a thin re-export of stream-chain 4.2.0+ and is slated for removal in a
 * future major — stream-json is a JSON *token* library, whereas JSONL yields whole
 * objects per line and belongs in stream-chain with the other substrate components.
 *
 * @param options - Parser configuration including reviver and error handling.
 * @returns A generator pipeline function for use in a `chain()` pipeline.
 */
declare function parser<T = unknown>(options?: parser.JsonlParserOptions): (chunk: string | Uint8Array) => AsyncGenerator<parser.JsonlItem<T>, void, unknown>;

declare namespace parser {
  /** Options for the JSONL parser. */
  export interface JsonlParserOptions {
    /** Called for each parsed value, like `JSON.parse()` reviver. */
    reviver?: (key: string, value: any) => any;
    /** Value to use in place of lines that fail to parse. If unset, errors propagate. */
    errorIndicator?: unknown;
    /** If `true`, emit errors for malformed lines instead of silently skipping. */
    checkErrors?: boolean;
  }
  /**
   * An item emitted by the JSONL parser: a sequential index and its parsed value.
   *
   * Generic in `T` (default `unknown`). Declare `JsonlItem<MyRow>` to type the
   * `value` field; the parser factory carries the parameter through.
   */
  export interface JsonlItem<T = unknown> {
    /** Zero-based line index. */
    key: number;
    /** The parsed JavaScript value, typed as `T` (default `unknown`). */
    value: T;
  }

  /**
   * The raw per-line parser factory — no `fixUtf8Stream()` / line-splitting front.
   * Returns a function that parses one full JSON line into a {@link JsonlItem}, or a
   * skip sentinel (`none`) for empty / dropped lines.
   */
  export function jsonlParser<T = unknown>(options?: JsonlParserOptions): (line: string) => JsonlItem<T> | symbol;
  /** Self-reference for backwards compat: `import {parser} from 'stream-json/core/jsonl/parser.js'`. */
  export const parser: typeof import('./parser.js').default;
}

type JsonlParserOptions = parser.JsonlParserOptions;
type JsonlItem<T = unknown> = parser.JsonlItem<T>;
/**
 * Top-level alias of `parser.jsonlParser` — the raw per-line parser factory with
 * no `fixUtf8Stream()` / line-splitting front. Re-exported for direct import:
 * `import {jsonlParser} from 'stream-json/core/jsonl/parser.js'`.
 *
 * @param options - Parser configuration including reviver and error handling.
 * @returns A function that parses one full JSON line into a {@link JsonlItem}, or a
 * skip sentinel (`none`) for empty / dropped lines.
 */
declare function jsonlParser<T = unknown>(options?: JsonlParserOptions): (line: string) => JsonlItem<T> | symbol;

export default parser;
export {parser, jsonlParser};
export type {JsonlParserOptions, JsonlItem};
