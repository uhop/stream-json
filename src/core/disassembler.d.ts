import type parser from './parser.js';

/**
 * Creates a disassembler that converts JavaScript objects into a token stream.
 *
 * The inverse of the parser: takes JS values and produces `{name, value}` tokens
 * following the same protocol. Supports `JSON.stringify()`-compatible `replacer` and `toJSON()`.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/disassembler.js`; for the Web-only entry import from
 * `stream-json/web/disassembler.js`.
 *
 * @param options - Packing, streaming, and replacer options.
 * @returns A function that takes a value and yields tokens via a generator.
 */
declare function disassembler(options?: disassembler.DisassemblerOptions): (value: unknown) => Generator<parser.Token, void, undefined>;

declare namespace disassembler {
  /** Options for the disassembler. */
  export interface DisassemblerOptions {
    /** Initial value for `packKeys`, `packStrings`, and `packNumbers`. */
    packValues?: boolean;
    /** Emit `keyValue` tokens. Default: `true`. */
    packKeys?: boolean;
    /** Emit `stringValue` tokens. Default: `true`. */
    packStrings?: boolean;
    /** Emit `numberValue` tokens. Default: `true`. */
    packNumbers?: boolean;
    /** Initial value for `streamKeys`, `streamStrings`, and `streamNumbers`. */
    streamValues?: boolean;
    /** Emit `startKey`/`endKey`/`stringChunk` tokens. Default: `true`. */
    streamKeys?: boolean;
    /** Emit `startString`/`endString`/`stringChunk` tokens. Default: `true`. */
    streamStrings?: boolean;
    /** Emit `startNumber`/`endNumber`/`numberChunk` tokens. Default: `true`. */
    streamNumbers?: boolean;
    /**
     * A replacer function or property whitelist array, matching `JSON.stringify()` semantics.
     */
    replacer?: ((key: string, value: any) => any) | string[];
  }

  /** Self-reference for `disassembler.disassembler === disassembler`. */
  export const disassembler: typeof import('./disassembler.js').default;
}

type DisassemblerOptions = disassembler.DisassemblerOptions;

export default disassembler;
export {disassembler};
export type {DisassemblerOptions};
