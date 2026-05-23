import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import type {StreamBaseOptions} from './stream-base.js';

/**
 * Streams top-level properties of a JSON object as `{key, value}` objects.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/streamers/stream-object.js`; for the Web-only entry import from
 * `stream-json/web/streamers/stream-object.js`.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamObject<T = unknown>(
  options?: StreamBaseOptions
): Flushable<parser.Token, streamObject.StreamObjectItem<T> | typeof none | Many<streamObject.StreamObjectItem<T>>>;

declare namespace streamObject {
  /**
   * An item emitted by `streamObject`: the property key and its assembled value.
   *
   * Generic in `T` (default `unknown`). Declare `StreamObjectItem<MyValue>` to
   * type the `value` field; the streamer factory and `.withParser` carry the
   * parameter through.
   */
  export interface StreamObjectItem<T = unknown> {
    /** Object property name. */
    key: string;
    /** The fully assembled JavaScript value, typed as `T` (default `unknown`). */
    value: T;
  }
  /** Creates a `parser() + streamObject()` pipeline as a flushable function. */
  export function withParser<T = unknown>(
    options?: StreamBaseOptions & parser.ParserOptions
  ): Flushable<string, StreamObjectItem<T> | typeof none | Many<StreamObjectItem<T>>>;
  /** Self-reference for `streamObject.streamObject === streamObject`. */
  export const streamObject: typeof import('./stream-object.js').default;
}

type StreamObjectItem<T = unknown> = streamObject.StreamObjectItem<T>;

export default streamObject;
export {streamObject};
export type {StreamObjectItem};
