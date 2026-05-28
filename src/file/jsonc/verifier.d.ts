import type {JsoncVerifierOptions, JsoncVerifierError} from '../../core/jsonc/verifier.js';

/**
 * Validates a JSONC file on disk.
 *
 * Resolves on valid input. On invalid input, rejects with the verifier's
 * `{message, line, pos, offset}` error.
 *
 * JSONC variant — accepts comments and trailing commas. Node-only.
 *
 * @param path - Path to the file to verify.
 * @param options - Combined verifier and read-block options.
 * @returns A promise resolving to `void` on valid input.
 */
declare function verifyFile(path: string, options?: verifyFile.VerifyFileOptions): Promise<void>;

declare namespace verifyFile {
  /** Options for the JSONC `verifyFile`. */
  export interface VerifyFileOptions extends JsoncVerifierOptions {
    /** Read-block size in bytes. Defaults to 64 KB. */
    readBlockSize?: number;
  }
}

type VerifyFileOptions = verifyFile.VerifyFileOptions;

export default verifyFile;
export {verifyFile};
export type {VerifyFileOptions, JsoncVerifierError};
