/// <reference types="node" />

import {Duplex} from 'node:stream';
import type {StreamBaseOptions} from '../core/streamers/stream-base.js';
import type {StreamValuesItem as CoreStreamValuesItem} from '../core/streamers/stream-values.js';
import type parser from '../core/parser.js';

/**
 * Streams successive top-level JSON values as `{key, value}` objects.
 *
 * Node-flavored entry: the returned factory has both `streamValues.asStream(options)`
 * (Node Duplex) and `streamValues.asWebStream(options)` (Web `{readable, writable}` pair) attached,
 * plus `withParserAsStream` / `withParserAsWebStream` parser-included variants.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamValues(options?: StreamBaseOptions): ReturnType<typeof import('../core/streamers/stream-values.js').default>;

declare namespace streamValues {
  /** An item emitted by `streamValues`. */
  export type StreamValuesItem = CoreStreamValuesItem;
  /** Creates a streamValues wrapped as a Node Duplex stream. */
  export function asStream(options?: StreamBaseOptions): Duplex;
  /** Creates a streamValues wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: StreamBaseOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a flushable function. */
  export function withParser(
    options?: StreamBaseOptions & parser.ParserOptions
  ): ReturnType<typeof import('../core/streamers/stream-values.js').default.withParser>;
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a Node Duplex stream. */
  export function withParserAsStream(options?: StreamBaseOptions & parser.ParserOptions): Duplex;
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: StreamBaseOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `streamValues.streamValues === streamValues`. */
  export const streamValues: typeof import('./stream-values.js').default;
}

type StreamValuesItem = streamValues.StreamValuesItem;

export default streamValues;
export {streamValues};
export type {StreamValuesItem};
