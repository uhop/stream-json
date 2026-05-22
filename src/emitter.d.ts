/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';
import type webEmitterDefault from './web/emitter.js';
import type {EmitterOptions as WebEmitterOptions, EmitterTarget as WebEmitterTarget} from './web/emitter.js';

/**
 * Creates a Writable stream that re-emits each token as a named EventEmitter event.
 *
 * For example, a `{name: 'startObject'}` token triggers a `'startObject'` event.
 * A Writable stream alternative to the `emit()` utility.
 *
 * @param options - Writable stream options.
 * @returns A Writable stream.
 */
declare function emitter(options?: WritableOptions): Writable;

declare namespace emitter {
  /** Alias of `emitter()` — returns a Node Writable. */
  export function asStream(options?: WritableOptions): Writable;
  /** Web counterpart — returns an `EventTarget` with a `.writable` `WritableStream` attached. */
  export const asWebStream: typeof webEmitterDefault;
  /** Self-reference for `emitter.emitter === emitter`. */
  export const emitter: typeof import('./emitter.js').default;
}

export default emitter;
export {emitter};
export type {WebEmitterOptions, WebEmitterTarget};
