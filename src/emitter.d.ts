/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

export = emitter;

/**
 * Creates a Writable stream that re-emits each token as a named event.
 *
 * For example, a `{name: 'startObject'}` token triggers a `'startObject'` event.
 * A Writable stream alternative to the `emit()` utility.
 *
 * @param options - Writable stream options.
 * @returns A Writable stream.
 */
declare function emitter(options?: WritableOptions): Writable;

declare namespace emitter {
  /** Alias of `emitter()`. */
  export function asStream(options?: WritableOptions): Writable;
  /** Alias of `emitter()`. */
  export function emitter(options?: WritableOptions): Writable;
}
