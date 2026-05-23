import type {StreamBaseOptions} from '../../core/streamers/stream-base.js';
import type {StreamObjectItem as CoreStreamObjectItem} from '../../core/streamers/stream-object.js';
import type parser from '../../core/parser.js';

/**
 * Streams top-level properties of a JSON object as `{key, value}` objects.
 *
 * Web-flavored entry: the returned factory has only `streamObject.asWebStream(options)` and
 * `streamObject.withParserAsWebStream(options)` attached.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamObject(options?: StreamBaseOptions): ReturnType<typeof import('../../core/streamers/stream-object.js').default>;

declare namespace streamObject {
  /** An item emitted by `streamObject`. */
  export type StreamObjectItem = CoreStreamObjectItem;
  /** Creates a streamObject wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: StreamBaseOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser() + streamObject()` pipeline as a flushable function. */
  export function withParser(
    options?: StreamBaseOptions & parser.ParserOptions
  ): ReturnType<typeof import('../../core/streamers/stream-object.js').default.withParser>;
  /** Creates a `parser() + streamObject()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: StreamBaseOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `streamObject.streamObject === streamObject`. */
  export const streamObject: typeof import('./stream-object.js').default;
}

type StreamObjectItem = streamObject.StreamObjectItem;

export default streamObject;
export {streamObject};
export type {StreamObjectItem};
