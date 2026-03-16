/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import parser from './parser';

export = disassembler;

/**
 * Creates a disassembler that converts JavaScript objects into a token stream.
 *
 * The inverse of the parser: takes JS values and produces `{name, value}` tokens
 * following the same protocol. Supports `JSON.stringify()`-compatible `replacer` and `toJSON()`.
 *
 * @param options - Packing, streaming, and replacer options.
 * @returns A function that takes a value and yields tokens via a generator.
 */
declare function disassembler(options?: disassembler.DisassemblerOptions): (value: any) => Generator<parser.Token, void, undefined>;

declare namespace disassembler {
  /** Options for the disassembler. Extends Node.js `DuplexOptions`. */
  export interface DisassemblerOptions extends DuplexOptions {
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
  /** Creates a disassembler wrapped as a Duplex stream (object mode on both sides). */
  export function asStream(options?: DisassemblerOptions): Duplex;
  /** Self-reference for destructuring: `const {disassembler} = require('stream-json/disassembler.js')`. */
  export {disassembler};
}
