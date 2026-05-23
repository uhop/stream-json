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
declare function streamValues<T = unknown>(
  options?: StreamBaseOptions
): Flushable<parser.Token, streamValues.StreamValuesItem<T> | typeof none | Many<streamValues.StreamValuesItem<T>>>;

declare namespace streamValues {
  /**
   * An item emitted by `streamValues`: a sequential index and its assembled value.
   *
   * Generic in `T` (default `unknown`). Declare `StreamValuesItem<MyValue>` to
   * type the `value` field; the streamer factory and `.withParser` carry the
   * parameter through.
   */
  export interface StreamValuesItem<T = unknown> {
    /** Zero-based sequential index. */
    key: number;
    /** The fully assembled JavaScript value, typed as `T` (default `unknown`). */
    value: T;
  }
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a flushable function. */
  export function withParser<T = unknown>(
    options?: StreamBaseOptions & parser.ParserOptions
  ): Flushable<string, StreamValuesItem<T> | typeof none | Many<StreamValuesItem<T>>>;
  /** Self-reference for `streamValues.streamValues === streamValues`. */
  export const streamValues: typeof import('./stream-values.js').default;
}

type StreamValuesItem<T = unknown> = streamValues.StreamValuesItem<T>;

export default streamValues;
export {streamValues};
export type {StreamValuesItem};
