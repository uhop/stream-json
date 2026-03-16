/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

export = jsonlStringer;

/**
 * Creates a JSONL (line-delimited JSON) stringer as a Transform stream.
 *
 * Each incoming object is serialized with `JSON.stringify()` and separated
 * by a configurable separator (default: `'\n'`).
 *
 * @param options - Stringer configuration.
 * @returns A Transform stream (writable side: objects, readable side: text).
 */
declare function jsonlStringer(options?: jsonlStringer.JsonlStringerOptions): Transform;

declare namespace jsonlStringer {
  /** Options for the JSONL stringer. Extends Node.js `TransformOptions`. */
  export interface JsonlStringerOptions extends TransformOptions {
    /** A `JSON.stringify()` replacer: a function or a property whitelist array. */
    replacer?: ((key: string, value: any) => any) | (string | number)[];
    /** Line separator between JSON values. Default: `'\n'`. */
    separator?: string;
    /** String prepended before the first value. Default: `''`. */
    prefix?: string;
    /** String appended after the last value on flush. Default: `''`. */
    suffix?: string;
    /** `JSON.stringify()` space argument for pretty-printing. */
    space?: string | number;
    /** String to emit when the stream ends without any values. */
    emptyValue?: string;
  }

  /** Creates a JSONL stringer as a Transform stream. */
  export function asStream(options?: JsonlStringerOptions): Transform;
  /** Alias of `asStream()`. */
  export function make(options?: JsonlStringerOptions): Transform;
  /** Alias of `asStream()`. */
  export function stringer(options?: JsonlStringerOptions): Transform;
  /** Self-reference for destructuring: `const {jsonlStringer} = require('stream-json/jsonl/stringer.js')`. */
  export {jsonlStringer};
}
