/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

export = Verifier;

/**
 * Validates JSON text without building any data structures.
 *
 * Consumes a text stream and either completes successfully or emits an error
 * with the exact offset, line, and position of the problem.
 */
declare class Verifier extends Writable {
  /** Creates a new Verifier instance. */
  static make(options?: Verifier.VerifierOptions): Verifier;
  /** Alias of `make()`. */
  static verifier(options?: Verifier.VerifierOptions): Verifier;
  constructor(options?: Verifier.VerifierOptions);
}

declare namespace Verifier {
  /** Options for the Verifier. Extends Node.js `WritableOptions`. */
  export interface VerifierOptions extends WritableOptions {
    /** Enable JSON Streaming (concatenated/line-delimited JSON). Default: `false`. */
    jsonStreaming?: boolean;
  }
  /** Error thrown by Verifier, pinpointing the location of invalid JSON. */
  export interface VerifierError extends Error {
    /** 1-based line number of the error. */
    line: number;
    /** 1-based position within the line. */
    pos: number;
    /** 0-based byte offset from the start of the stream. */
    offset: number;
  }
}
