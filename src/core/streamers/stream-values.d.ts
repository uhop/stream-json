import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import type {StreamBaseOptions} from './stream-base.js';

/**
 * Streams successive top-level JSON values as `{key, value}` objects.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/streamers/stream-values.js`; for the Web-only entry import from
 * `stream-json/web/streamers/stream-values.js`.
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
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a flushable function. */
  export function withParser(options?: StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  /** Self-reference for `streamValues.streamValues === streamValues`. */
  export const streamValues: typeof import('./stream-values.js').default;
}

type StreamValuesItem = streamValues.StreamValuesItem;

export default streamValues;
export {streamValues};
export type {StreamValuesItem};
