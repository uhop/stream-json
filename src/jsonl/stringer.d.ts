/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

export = JsonlStringer;

/**
 * Converts a stream of JavaScript objects into JSONL (line-delimited JSON) text.
 *
 * Each incoming object is serialized with `JSON.stringify()` and terminated
 * by a configurable separator (default: `'\n'`).
 */
declare class JsonlStringer extends Transform {
  /** Creates a new JsonlStringer instance. */
  static make(options?: JsonlStringer.JsonlStringerOptions): JsonlStringer;
  /** Alias of `make()`. */
  static stringer(options?: JsonlStringer.JsonlStringerOptions): JsonlStringer;
  constructor(options?: JsonlStringer.JsonlStringerOptions);
}

declare namespace JsonlStringer {
  /** Options for the JSONL stringer. Extends Node.js `TransformOptions`. */
  export interface JsonlStringerOptions extends TransformOptions {
    /** A `JSON.stringify()` replacer function. */
    replacer?: (key: string, value: any) => any;
    /** Line separator between JSON values. Default: `'\n'`. */
    separator?: string;
  }
}
