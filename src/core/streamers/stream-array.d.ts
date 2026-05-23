import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import type {StreamBaseOptions} from './stream-base.js';

/**
 * Streams elements of a top-level JSON array as `{key, value}` objects.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/streamers/stream-array.js`; for the Web-only entry import from
 * `stream-json/web/streamers/stream-array.js`.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamArray<T = unknown>(
  options?: StreamBaseOptions
): Flushable<parser.Token, streamArray.StreamArrayItem<T> | typeof none | Many<streamArray.StreamArrayItem<T>>>;

declare namespace streamArray {
  /**
   * An item emitted by `streamArray`: the array index and its assembled value.
   *
   * Generic in `T` (default `unknown`). Declare `StreamArrayItem<MyRow>` to type
   * the `value` field; the streamer factory and `.withParser` carry the parameter
   * through.
   */
  export interface StreamArrayItem<T = unknown> {
    /** Zero-based array index. */
    key: number;
    /** The fully assembled JavaScript value, typed as `T` (default `unknown`). */
    value: T;
  }
  /** Creates a `parser() + streamArray()` pipeline as a flushable function. */
  export function withParser<T = unknown>(
    options?: StreamBaseOptions & parser.ParserOptions
  ): Flushable<string, StreamArrayItem<T> | typeof none | Many<StreamArrayItem<T>>>;
  /** Self-reference for `streamArray.streamArray === streamArray`. */
  export const streamArray: typeof import('./stream-array.js').default;
}

type StreamArrayItem<T = unknown> = streamArray.StreamArrayItem<T>;

export default streamArray;
export {streamArray};
export type {StreamArrayItem};
