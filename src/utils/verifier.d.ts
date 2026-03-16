/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, none} from 'stream-chain/defs.js';

export = verifier;

/**
 * Creates a composable JSON validator pipeline.
 *
 * Composes `fixUtf8Stream()` with a flushable validation function.
 * Consumes text and either completes successfully or throws an error
 * with the exact offset, line, and position of the problem.
 *
 * @param options - Verifier configuration.
 * @returns A composable function for use in a `chain()` pipeline.
 */
declare function verifier(options?: verifier.VerifierOptions): Flushable<string, typeof none>;

declare namespace verifier {
  /** Options for the Verifier. Extends Node.js `DuplexOptions`. */
  export interface VerifierOptions extends DuplexOptions {
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

  /** Creates a Verifier as a Duplex stream. */
  export function asStream(options?: VerifierOptions): Duplex;
  /** Alias of `asStream()`. */
  export function make(options?: VerifierOptions): Duplex;
  /** Alias of `asStream()`. */
  export function verifier(options?: VerifierOptions): Duplex;
}
