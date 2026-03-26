/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, none} from 'stream-chain/defs.js';

export = jsoncVerifier;

/**
 * Creates a composable JSONC validator pipeline.
 *
 * Composes `fixUtf8Stream()` with a flushable validation function.
 * Consumes text and either completes successfully or throws an error
 * with the exact offset, line, and position of the problem.
 *
 * Extends the standard Verifier with support for single-line (`//`) and
 * multi-line (`/* ... *​/`) comments and trailing commas.
 *
 * @param options - Verifier configuration.
 * @returns A composable function for use in a `chain()` pipeline.
 */
declare function jsoncVerifier(options?: jsoncVerifier.JsoncVerifierOptions): Flushable<string, typeof none>;

declare namespace jsoncVerifier {
  /** Options for the JSONC Verifier. Extends Node.js `DuplexOptions`. */
  export interface JsoncVerifierOptions extends DuplexOptions {
    /** Enable JSON Streaming (concatenated/line-delimited JSON). Default: `false`. */
    jsonStreaming?: boolean;
  }
  /** Error thrown by JSONC Verifier, pinpointing the location of invalid JSONC. */
  export interface JsoncVerifierError extends Error {
    /** 1-based line number of the error. */
    line: number;
    /** 1-based position within the line. */
    pos: number;
    /** 0-based byte offset from the start of the stream. */
    offset: number;
  }

  /** Creates a JSONC Verifier as a Duplex stream. */
  export function asStream(options?: JsoncVerifierOptions): Duplex;
  /** Self-reference for destructuring: `const {jsoncVerifier} = require('stream-json/jsonc/verifier.js')`. */
  export {jsoncVerifier};
  /** Self-reference for destructuring: `const {verifier} = require('stream-json/jsonc/verifier.js')`. */
  export {jsoncVerifier as verifier};
}
