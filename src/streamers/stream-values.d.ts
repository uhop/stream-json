import {Duplex} from 'node:stream';
import parser from '../parser';
import streamBase from './stream-base';
import {none} from 'stream-chain/defs.js';

export = streamValues;

/**
 * Streams successive top-level JSON values as `{key, value}` objects.
 *
 * Handles JSON Streaming (concatenated values) and is the typical companion
 * for `pick()` when it selects multiple subobjects.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamValues(options?: streamBase.StreamBaseOptions): (chunk: parser.Token) => streamValues.StreamValuesItem | typeof none;

declare namespace streamValues {
  /** An item emitted by `streamValues`: a sequential index and its assembled value. */
  export interface StreamValuesItem {
    /** Zero-based sequential index. */
    key: number;
    /** The fully assembled JavaScript value. */
    value: any;
  }
  /** Creates a streamValues as a Duplex stream. */
  export function asStream(options?: streamBase.StreamBaseOptions): Duplex;
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a flushable function. */
  export function withParser(options?: streamBase.StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: streamBase.StreamBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for destructuring. */
  export {streamValues};
}
