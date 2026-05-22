import {Flushable, none} from 'stream-chain/defs.js';

/**
 * Creates a composable JSON validator pipeline.
 *
 * Composes `fixUtf8Stream()` with a flushable validation function.
 * Consumes text and either completes successfully or throws an error
 * with the exact offset, line, and position of the problem.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/utils/verifier.js`; for the Web-only entry import from
 * `stream-json/web/utils/verifier.js`.
 *
 * @param options - Verifier configuration.
 * @returns A composable function for use in a `chain()` pipeline.
 */
declare function verifier(options?: verifier.VerifierOptions): Flushable<string, typeof none>;

declare namespace verifier {
  /** Options for the Verifier. */
  export interface VerifierOptions {
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

  /** Self-reference for `verifier.verifier === verifier`. */
  export const verifier: typeof import('./verifier.js').default;
}

type VerifierOptions = verifier.VerifierOptions;
type VerifierError = verifier.VerifierError;

export default verifier;
export {verifier};
export type {VerifierOptions, VerifierError};
