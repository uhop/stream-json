/// <reference types="node" />

import {Duplex} from 'node:stream';

/**
 * Listens to a token stream and re-emits each token as a named event on the same stream.
 *
 * A lightweight alternative to `Emitter`: instead of a separate Writable,
 * events are emitted directly on the given stream.
 *
 * @param stream - A readable token stream (e.g., from `parser.asStream()`).
 * @returns The same stream, for chaining.
 */
declare function emit<T extends NodeJS.ReadableStream>(stream: T): T;

export = emit;
