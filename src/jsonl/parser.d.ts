/// <reference types="node" />

import {TransformOptions} from 'node:stream';
import Utf8Stream from '../utils/utf8-stream';

export = JsonlParser;

/**
 * Parses JSONL (line-delimited JSON) text into a stream of `{key, value}` objects.
 *
 * Each line is parsed with `JSON.parse()`. Faster than the equivalent
 * `parser({jsonStreaming: true}) + streamValues()` when individual items fit in memory.
 */
declare class JsonlParser extends Utf8Stream {
  /** Creates a new JsonlParser instance. */
  static make(options?: JsonlParser.JsonlParserOptions): JsonlParser;
  /** Alias of `make()`. */
  static parser(options?: JsonlParser.JsonlParserOptions): JsonlParser;
  /**
   * Parses a single JSON line, returning the parsed value or `errorIndicator` on failure.
   *
   * @param input - A JSON string to parse.
   * @param reviver - Optional `JSON.parse()` reviver.
   * @param errorIndicator - Value to return on parse error (default: throws).
   */
  static checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: any): any;
  constructor(options?: JsonlParser.JsonlParserOptions);
}

declare namespace JsonlParser {
  /** Options for the JSONL parser. Extends Node.js `TransformOptions`. */
  export interface JsonlParserOptions extends TransformOptions {
    /** Called for each parsed value, like `JSON.parse()` reviver. */
    reviver?: (key: string, value: any) => any;
    /** Value to use in place of lines that fail to parse. If unset, errors propagate. */
    errorIndicator?: any;
    /** If `true`, emit errors for malformed lines instead of silently skipping. */
    checkErrors?: boolean;
  }
  /** An item emitted by `JsonlParser`: a sequential index and its parsed value. */
  export interface JsonlItem {
    /** Zero-based line index. */
    key: number;
    /** The parsed JavaScript value. */
    value: any;
  }
}
