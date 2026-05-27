import type {JsoncVerifierOptions as CoreJsoncVerifierOptions, JsoncVerifierError as CoreJsoncVerifierError} from '../../core/jsonc/verifier.js';

/**
 * Creates a composable JSONC validator pipeline.
 *
 * Web-flavored entry: the returned factory has only `jsoncVerifier.asWebStream(options)` attached.
 *
 * @param options - Verifier configuration.
 * @returns A composable function for use in a `chain()` pipeline.
 */
declare function verifier(options?: verifier.JsoncVerifierOptions): ReturnType<typeof import('../../core/jsonc/verifier.js').default>;

declare namespace verifier {
  /** Options for the JSONC Verifier. */
  export type JsoncVerifierOptions = CoreJsoncVerifierOptions;
  /** Error thrown by JSONC Verifier, pinpointing the location of invalid JSONC. */
  export type JsoncVerifierError = CoreJsoncVerifierError;
  /** Creates a JSONC Verifier wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: JsoncVerifierOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for backwards compat. */
  export const verifier: typeof import('./verifier.js').default;
}

type JsoncVerifierOptions = verifier.JsoncVerifierOptions;
type JsoncVerifierError = verifier.JsoncVerifierError;

export default verifier;
export {verifier};
export type {JsoncVerifierOptions, JsoncVerifierError};
