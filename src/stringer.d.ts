/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, none} from 'stream-chain/defs.js';

export = stringer;

/**
 * Creates a flushable function that converts a token stream into JSON text.
 *
 * If `Parser` is `JSON.parse()`, then `Stringer` is `JSON.stringify()` for token streams.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.StringerOptions): Flushable<any, string | typeof none>;

declare namespace stringer {
  /** Options for the Stringer. Extends Node.js `DuplexOptions`. */
  export interface StringerOptions extends DuplexOptions {
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

  /** Creates a Stringer as a Duplex stream. */
  export function asStream(options?: StringerOptions): Duplex;
  /** Alias of `asStream()`. */
  export function make(options?: StringerOptions): Duplex;
  /** Alias of `asStream()`. */
  export function stringer(options?: StringerOptions): Duplex;
}
