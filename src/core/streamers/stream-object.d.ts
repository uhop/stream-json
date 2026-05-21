/// <reference types="node" />

import {Duplex} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import type {StreamBaseOptions} from './stream-base.js';

/**
 * Streams top-level properties of a JSON object as `{key, value}` objects.
 *
 * Expects the token stream to represent a single object. Each property is
 * fully assembled in memory and emitted individually.
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
  /** Creates a streamObject as a Duplex stream. */
  export function asStream(options?: StreamBaseOptions): Duplex;
  /** Creates a `parser() + streamObject()` pipeline as a flushable function. */
  export function withParser(options?: StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  /** Creates a `parser() + streamObject()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: StreamBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for `streamObject.streamObject === streamObject`. */
  export const streamObject: typeof import('./stream-object.js').default;
}

type StreamObjectItem = streamObject.StreamObjectItem;

export default streamObject;
export {streamObject};
export type {StreamObjectItem};
