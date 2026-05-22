import type {DisassemblerOptions as CoreDisassemblerOptions} from '../core/disassembler.js';

/**
 * Creates a disassembler that converts JavaScript objects into a token stream.
 *
 * Web-flavored entry: the returned factory has only `disassembler.asWebStream(options)`
 * attached. No Node-stream imports are pulled in via this subpath.
 *
 * @param options - Packing, streaming, and replacer options.
 * @returns A function that takes a value and yields tokens via a generator.
 */
declare function disassembler(options?: disassembler.DisassemblerOptions): ReturnType<typeof import('../core/disassembler.js').default>;

declare namespace disassembler {
  /** Options for the disassembler. */
  export type DisassemblerOptions = CoreDisassemblerOptions;
  /** Creates a disassembler wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: DisassemblerOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `disassembler.disassembler === disassembler`. */
  export const disassembler: typeof import('./disassembler.js').default;
}

type DisassemblerOptions = disassembler.DisassemblerOptions;

export default disassembler;
export {disassembler};
export type {DisassemblerOptions};
