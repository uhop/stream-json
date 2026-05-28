import type {VerifierOptions as CoreVerifierOptions, VerifierError} from '../core/utils/verifier.js';

/**
 * Validates a JSON file on disk.
 *
 * Resolves on valid input. On invalid input, rejects with the verifier's
 * `{message, line, pos, offset}` error — line/pos/offset point at the byte
 * where parsing failed.
 *
 * Standalone — not a chain stage. Node-only — reads through `node:fs/promises`.
 *
 * @param path - Path to the file to verify.
 * @param options - Combined verifier and read-block options.
 * @returns A promise resolving to `void` on valid input.
 */
declare function verifyFile(path: string, options?: verifyFile.VerifyFileOptions): Promise<void>;

declare namespace verifyFile {
  /** Options for `verifyFile`. */
  export interface VerifyFileOptions extends CoreVerifierOptions {
    /** Read-block size in bytes. Defaults to 64 KB. */
    readBlockSize?: number;
  }
}

type VerifyFileOptions = verifyFile.VerifyFileOptions;

export default verifyFile;
export {verifyFile};
export type {VerifyFileOptions, VerifierError};
