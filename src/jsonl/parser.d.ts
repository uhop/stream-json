/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';

export = jsonlParser;

/**
 * Creates a JSONL (line-delimited JSON) parser as a generator pipeline.
 *
 * Each line is parsed with `JSON.parse()`. Faster than the equivalent
 * `parser({jsonStreaming: true}) + streamValues()` when individual items fit in memory.
 *
 * @param options - Parser configuration including reviver and error handling.
 * @returns A generator pipeline function for use in a `chain()` pipeline.
 */
declare function jsonlParser(options?: jsonlParser.JsonlParserOptions): (chunk: string | Buffer) => AsyncGenerator<jsonlParser.JsonlItem, void, unknown>;

declare namespace jsonlParser {
  /** Options for the JSONL parser. Extends Node.js `DuplexOptions`. */
  export interface JsonlParserOptions extends DuplexOptions {
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
   * Creates a JSONL parser wrapped as a Duplex stream.
   *
   * Writable side accepts text (Buffer/string), readable side emits `{key, value}` objects.
   */
  export function asStream(options?: JsonlParserOptions): Duplex;
  /** Alias of `asStream()`. */
  export function parser(options?: JsonlParserOptions): Duplex;
  /**
   * Parses a single JSON line, returning the parsed value or `errorIndicator` on failure.
   *
   * @param input - A JSON string to parse.
   * @param reviver - Optional `JSON.parse()` reviver.
   * @param errorIndicator - Value to return on parse error (default: throws).
   */
  export function checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: any): any;
  /** Self-reference for destructuring: `const {jsonlParser} = require('stream-json/jsonl/parser.js')`. */
  export {jsonlParser};
}
