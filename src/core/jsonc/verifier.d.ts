import {Flushable, none} from 'stream-chain/defs.js';

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
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/jsonc/verifier.js`; for the Web-only entry import from
 * `stream-json/web/jsonc/verifier.js`.
 *
 * @param options - Verifier configuration.
 * @returns A composable function for use in a `chain()` pipeline.
 */
declare function verifier(options?: verifier.JsoncVerifierOptions): Flushable<string, typeof none>;

declare namespace verifier {
  /** Options for the JSONC Verifier. */
  export interface JsoncVerifierOptions {
    /** Enable JSON Streaming (concatenated/line-delimited JSON). Default: `false`. */
    jsonStreaming?: boolean;
    /** Keep a byte-order mark (U+FEFF) that starts the input instead of dropping it. Default: `false`. */
    ignoreBOM?: boolean;
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

  /** Self-reference for backwards compat: `import {verifier} from 'stream-json/core/jsonc/verifier.js'`. */
  export const verifier: typeof import('./verifier.js').default;
}

/**
 * The validation function behind the JSONC `verifier()`, without its `fixUtf8Stream()` front: it
 * consumes strings only, and a leading byte-order mark is an error (`ignoreBOM` has no effect here).
 *
 * @param options - Verifier configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function jsoncVerifier(options?: verifier.JsoncVerifierOptions): Flushable<string, typeof none>;

type JsoncVerifierOptions = verifier.JsoncVerifierOptions;
type JsoncVerifierError = verifier.JsoncVerifierError;

export default verifier;
export {verifier, jsoncVerifier};
export type {JsoncVerifierOptions, JsoncVerifierError};
