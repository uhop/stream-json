/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

export = Verifier;

declare class Verifier extends Writable {
  static make(options?: Verifier.VerifierOptions): Verifier;
  static verifier(options?: Verifier.VerifierOptions): Verifier;
  constructor(options?: Verifier.VerifierOptions);
}

declare namespace Verifier {
  export interface VerifierOptions extends WritableOptions {
    jsonStreaming?: boolean;
  }
  export interface VerifierError extends Error {
    line: number;
    pos: number;
    offset: number;
  }
}
