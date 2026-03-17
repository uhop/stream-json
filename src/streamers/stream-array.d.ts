import {Duplex} from 'node:stream';
import parser from '../parser';
import streamBase from './stream-base';
import {none} from 'stream-chain/defs.js';

export = streamArray;

/**
 * Streams elements of a top-level JSON array as `{key, value}` objects.
 *
 * Expects the token stream to represent a single array. Each element is
 * fully assembled in memory and emitted individually.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamArray(options?: streamBase.StreamBaseOptions): (chunk: parser.Token) => streamArray.StreamArrayItem | typeof none;

declare namespace streamArray {
  /** An item emitted by `streamArray`: the array index and its assembled value. */
  export interface StreamArrayItem {
    /** Zero-based array index. */
    key: number;
    /** The fully assembled JavaScript value. */
    value: any;
  }
  /** Creates a streamArray as a Duplex stream. */
  export function asStream(options?: streamBase.StreamBaseOptions): Duplex;
  /** Creates a `parser() + streamArray()` pipeline as a flushable function. */
  export function withParser(options?: streamBase.StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  /** Creates a `parser() + streamArray()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: streamBase.StreamBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for destructuring. */
  export {streamArray};
}
