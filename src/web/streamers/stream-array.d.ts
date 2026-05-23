import type {StreamBaseOptions} from '../../core/streamers/stream-base.js';
import type {StreamArrayItem as CoreStreamArrayItem} from '../../core/streamers/stream-array.js';
import type parser from '../../core/parser.js';

/**
 * Streams elements of a top-level JSON array as `{key, value}` objects.
 *
 * Web-flavored entry: the returned factory has only `streamArray.asWebStream(options)` and
 * `streamArray.withParserAsWebStream(options)` attached.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamArray<T = unknown>(options?: StreamBaseOptions): ReturnType<typeof import('../../core/streamers/stream-array.js').default<T>>;

declare namespace streamArray {
  /** An item emitted by `streamArray`. Generic in `T` — declare `StreamArrayItem<MyRow>` to type `value`. */
  export type StreamArrayItem<T = unknown> = CoreStreamArrayItem<T>;
  /** Creates a streamArray wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: StreamBaseOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser() + streamArray()` pipeline as a flushable function. */
  export function withParser<T = unknown>(
    options?: StreamBaseOptions & parser.ParserOptions
  ): ReturnType<typeof import('../../core/streamers/stream-array.js').default.withParser<T>>;
  /** Creates a `parser() + streamArray()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: StreamBaseOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `streamArray.streamArray === streamArray`. */
  export const streamArray: typeof import('./stream-array.js').default;
}

type StreamArrayItem = streamArray.StreamArrayItem;

export default streamArray;
export {streamArray};
export type {StreamArrayItem};
