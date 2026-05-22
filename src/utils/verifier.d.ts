/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import type {VerifierOptions as CoreVerifierOptions, VerifierError as CoreVerifierError} from '../core/utils/verifier.js';

/**
 * Creates a composable JSON validator pipeline.
 *
 * Node-flavored entry: the returned factory has both `verifier.asStream(options)`
 * (Node Duplex) and `verifier.asWebStream(options)` (Web `{readable, writable}` pair) attached.
 *
 * @param options - Verifier configuration.
 * @returns A composable function for use in a `chain()` pipeline.
 */
declare function verifier(options?: verifier.VerifierOptions): ReturnType<typeof import('../core/utils/verifier.js').default>;

declare namespace verifier {
  /** Options for the Verifier. Extends Node.js `DuplexOptions`. */
  export interface VerifierOptions extends CoreVerifierOptions, DuplexOptions {}
  /** Error thrown by Verifier, pinpointing the location of invalid JSON. */
  export type VerifierError = CoreVerifierError;
  /** Creates a Verifier wrapped as a Node Duplex stream. */
  export function asStream(options?: VerifierOptions): Duplex;
  /** Creates a Verifier wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: VerifierOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `verifier.verifier === verifier`. */
  export const verifier: typeof import('./verifier.js').default;
}

type VerifierOptions = verifier.VerifierOptions;
type VerifierError = verifier.VerifierError;

export default verifier;
export {verifier};
export type {VerifierOptions, VerifierError};
