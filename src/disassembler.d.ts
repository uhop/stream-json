/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import type {DisassemblerOptions as CoreDisassemblerOptions} from './core/disassembler.js';

/**
 * Creates a disassembler that converts JavaScript objects into a token stream.
 *
 * Node-flavored entry: the returned factory has both `disassembler.asStream(options)`
 * (Node Duplex) and `disassembler.asWebStream(options)` (Web `{readable, writable}` pair) attached.
 *
 * @param options - Packing, streaming, and replacer options.
 * @returns A function that takes a value and yields tokens via a generator.
 */
declare function disassembler(options?: disassembler.DisassemblerOptions): ReturnType<typeof import('./core/disassembler.js').default>;

declare namespace disassembler {
  /** Options for the disassembler. Extends Node.js `DuplexOptions`. */
  export interface DisassemblerOptions extends CoreDisassemblerOptions, DuplexOptions {}
  /** Creates a disassembler wrapped as a Node Duplex stream. */
  export function asStream(options?: DisassemblerOptions): Duplex;
  /** Creates a disassembler wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: DisassemblerOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `disassembler.disassembler === disassembler`. */
  export const disassembler: typeof import('./disassembler.js').default;
}

type DisassemblerOptions = disassembler.DisassemblerOptions;

export default disassembler;
export {disassembler};
export type {DisassemblerOptions};
