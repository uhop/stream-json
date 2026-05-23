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
 * @param options - Parser configuration including reviver and error handling.
 * @returns A generator pipeline function for use in a `chain()` pipeline.
 */
declare function jsonlParser(options?: jsonlParser.JsonlParserOptions): (chunk: string | Uint8Array) => AsyncGenerator<jsonlParser.JsonlItem, void, unknown>;

declare namespace jsonlParser {
  /** Options for the JSONL parser. */
  export interface JsonlParserOptions {
    /** Called for each parsed value, like `JSON.parse()` reviver. */
    reviver?: (key: string, value: any) => any;
    /** Value to use in place of lines that fail to parse. If unset, errors propagate. */
    errorIndicator?: any;
    /** If `true`, emit errors for malformed lines instead of silently skipping. */
    checkErrors?: boolean;
  }
  /** An item emitted by the JSONL parser: a sequential index and its parsed value. */
  export interface JsonlItem {
    /** Zero-based line index. */
    key: number;
    /** The parsed JavaScript value. */
    value: any;
  }

  /**
   * Parses a single JSON line, returning the parsed value or `errorIndicator` on failure.
   *
   * @param input - A JSON string to parse.
   * @param reviver - Optional `JSON.parse()` reviver.
   * @param errorIndicator - Value to return on parse error (default: throws).
   */
  export function checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: any): any;
  /** Self-reference for `jsonlParser.jsonlParser === jsonlParser`. */
  export const jsonlParser: typeof import('./parser.js').default;
  /** Self-reference for `jsonlParser.parser === jsonlParser`. */
  export const parser: typeof import('./parser.js').default;
}

type JsonlParserOptions = jsonlParser.JsonlParserOptions;
type JsonlItem = jsonlParser.JsonlItem;
/**
 * Top-level alias of `jsonlParser.checkedParse` — re-exported for direct
 * import: `import {checkedParse} from 'stream-json/core/jsonl/parser.js'`.
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
declare function checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: any): any;

export default jsonlParser;
export {jsonlParser, jsonlParser as parser, checkedParse};
export type {JsonlParserOptions, JsonlItem};
