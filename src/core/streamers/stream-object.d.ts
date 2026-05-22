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
declare function streamObject(
  options?: StreamBaseOptions
): Flushable<parser.Token, streamObject.StreamObjectItem | typeof none | Many<streamObject.StreamObjectItem>>;

declare namespace streamObject {
  /** An item emitted by `streamObject`: the property key and its assembled value. */
  export interface StreamObjectItem {
    /** Object property name. */
    key: string;
    /** The fully assembled JavaScript value. */
    value: any;
  }
  /** Creates a `parser() + streamObject()` pipeline as a flushable function. */
  export function withParser(options?: StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  /** Self-reference for `streamObject.streamObject === streamObject`. */
  export const streamObject: typeof import('./stream-object.js').default;
}

type StreamObjectItem = streamObject.StreamObjectItem;

export default streamObject;
export {streamObject};
export type {StreamObjectItem};
