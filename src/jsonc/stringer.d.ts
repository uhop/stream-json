/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import type {JsoncStringerOptions as CoreJsoncStringerOptions} from '../core/jsonc/stringer.js';

/**
 * Creates a flushable function that converts a token stream (including JSONC
 * `whitespace` and `comment` tokens) back into JSONC text.
 *
 * Node-flavored entry: the returned factory has both `jsoncStringer.asStream(options)`
 * (Node Duplex) and `jsoncStringer.asWebStream(options)` (Web `{readable, writable}` pair) attached.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.JsoncStringerOptions): ReturnType<typeof import('../core/jsonc/stringer.js').default>;

declare namespace stringer {
  /** Options for the JSONC Stringer. Extends Node.js `DuplexOptions`. */
  export interface JsoncStringerOptions extends CoreJsoncStringerOptions, DuplexOptions {}
  /** Creates a JSONC Stringer wrapped as a Node Duplex stream. */
  export function asStream(options?: JsoncStringerOptions): Duplex;
  /** Creates a JSONC Stringer wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: JsoncStringerOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for backwards compat. */
  export const stringer: typeof import('./stringer.js').default;
}

type JsoncStringerOptions = stringer.JsoncStringerOptions;

export default stringer;
export {stringer, stringer as jsoncStringer};
export type {JsoncStringerOptions};
