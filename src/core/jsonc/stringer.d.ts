/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, none} from 'stream-chain/defs.js';

/**
 * Creates a flushable function that converts a token stream (including JSONC
 * `whitespace` and `comment` tokens) back into JSONC text.
 *
 * Base tokens are handled identically to `stringer`. Whitespace and comment
 * tokens are output verbatim.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function jsoncStringer(options?: jsoncStringer.JsoncStringerOptions): Flushable<any, string | typeof none>;

declare namespace jsoncStringer {
  /** Options for the JSONC Stringer. Extends Node.js `DuplexOptions`. */
  export interface JsoncStringerOptions extends DuplexOptions {
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

  /** Creates a JSONC Stringer as a Duplex stream. */
  export function asStream(options?: JsoncStringerOptions): Duplex;
  /** Self-reference for `jsoncStringer.jsoncStringer === jsoncStringer`. */
  export const jsoncStringer: typeof import('./stringer.js').default;
  /** Self-reference for `jsoncStringer.stringer === jsoncStringer`. */
  export const stringer: typeof import('./stringer.js').default;
}

type JsoncStringerOptions = jsoncStringer.JsoncStringerOptions;

export default jsoncStringer;
export {jsoncStringer, jsoncStringer as stringer};
export type {JsoncStringerOptions};
