/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

export = Stringer;

/**
 * Converts a token stream back into JSON text.
 *
 * Writable side accepts token objects; readable side emits JSON text chunks.
 * If `Parser` is `JSON.parse()`, then `Stringer` is `JSON.stringify()` for token streams.
 */
declare class Stringer extends Transform {
  /** Creates a new Stringer instance. */
  static make(options?: Stringer.StringerOptions): Stringer;
  /** Alias of `make()`. */
  static stringer(options?: Stringer.StringerOptions): Stringer;
  constructor(options?: Stringer.StringerOptions);
}

declare namespace Stringer {
  /** Options for the Stringer. Extends Node.js `TransformOptions`. */
  export interface StringerOptions extends TransformOptions {
    /** Initial value for `useKeyValues`, `useStringValues`, and `useNumberValues`. */
    useValues?: boolean;
    /** Use packed `keyValue` tokens instead of streamed key chunks. Default: `false`. */
    useKeyValues?: boolean;
    /** Use packed `stringValue` tokens instead of streamed string chunks. Default: `false`. */
    useStringValues?: boolean;
    /** Use packed `numberValue` tokens instead of streamed number chunks. Default: `false`. */
    useNumberValues?: boolean;
    /** Wrap all incoming JSON values in an array. Default: `false`. */
    makeArray?: boolean;
  }
}
