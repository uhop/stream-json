/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import type {StringerOptions as CoreStringerOptions} from './core/stringer.js';

/**
 * Creates a flushable function that converts a token stream into JSON text.
 *
 * Node-flavored entry: the returned factory has both `stringer.asStream(options)`
 * (Node Duplex) and `stringer.asWebStream(options)` (Web `{readable, writable}` pair) attached.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.StringerOptions): ReturnType<typeof import('./core/stringer.js').default>;

declare namespace stringer {
  /** Options for the Stringer. Extends Node.js `DuplexOptions`. */
  export interface StringerOptions extends CoreStringerOptions, DuplexOptions {}
  /** Creates a Stringer wrapped as a Node Duplex stream. */
  export function asStream(options?: StringerOptions): Duplex;
  /** Creates a Stringer wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: StringerOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `stringer.stringer === stringer`. */
  export const stringer: typeof import('./stringer.js').default;
}

type StringerOptions = stringer.StringerOptions;

export default stringer;
export {stringer};
export type {StringerOptions};
