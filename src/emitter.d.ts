/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

/**
 * Consumes a token stream and re-emits each token as a named event.
 *
 * For example, a `{name: 'startObject'}` token triggers a `'startObject'` event.
 * A Writable stream alternative to the `emit()` utility.
 */
declare class Emitter extends Writable {
  /** Creates a new Emitter instance. */
  static make(options?: WritableOptions): Emitter;
  /** Alias of `make()`. */
  static emitter(options?: WritableOptions): Emitter;
  constructor(options?: WritableOptions);
}

export = Emitter;
