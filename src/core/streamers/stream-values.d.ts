/// <reference types="node" />

import {Duplex} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import type {StreamBaseOptions} from './stream-base.js';

/**
 * Streams successive top-level JSON values as `{key, value}` objects.
 *
 * Handles JSON Streaming (concatenated values) and is the typical companion
 * for `pick()` when it selects multiple subobjects.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamValues(
  options?: StreamBaseOptions
): Flushable<parser.Token, streamValues.StreamValuesItem | typeof none | Many<streamValues.StreamValuesItem>>;

declare namespace streamValues {
  /** An item emitted by `streamValues`: a sequential index and its assembled value. */
  export interface StreamValuesItem {
    /** Zero-based sequential index. */
    key: number;
    /** The fully assembled JavaScript value. */
    value: any;
  }
  /** Creates a streamValues as a Duplex stream. */
  export function asStream(options?: StreamBaseOptions): Duplex;
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a flushable function. */
  export function withParser(options?: StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: StreamBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for `streamValues.streamValues === streamValues`. */
  export const streamValues: typeof import('./stream-values.js').default;
}

type StreamValuesItem = streamValues.StreamValuesItem;

export default streamValues;
export {streamValues};
export type {StreamValuesItem};
