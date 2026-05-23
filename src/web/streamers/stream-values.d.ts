import type {StreamBaseOptions} from '../../core/streamers/stream-base.js';
import type {StreamValuesItem as CoreStreamValuesItem} from '../../core/streamers/stream-values.js';
import type parser from '../../core/parser.js';

/**
 * Streams successive top-level JSON values as `{key, value}` objects.
 *
 * Web-flavored entry: the returned factory has only `streamValues.asWebStream(options)` and
 * `streamValues.withParserAsWebStream(options)` attached.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamValues<T = unknown>(options?: StreamBaseOptions): ReturnType<typeof import('../../core/streamers/stream-values.js').default<T>>;

declare namespace streamValues {
  /** An item emitted by `streamValues`. Generic in `T` — declare `StreamValuesItem<MyValue>` to type `value`. */
  export type StreamValuesItem<T = unknown> = CoreStreamValuesItem<T>;
  /** Creates a streamValues wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: StreamBaseOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a flushable function. */
  export function withParser<T = unknown>(
    options?: StreamBaseOptions & parser.ParserOptions
  ): ReturnType<typeof import('../../core/streamers/stream-values.js').default.withParser<T>>;
  /** Creates a `parser({jsonStreaming: true}) + streamValues()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: StreamBaseOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `streamValues.streamValues === streamValues`. */
  export const streamValues: typeof import('./stream-values.js').default;
}

type StreamValuesItem = streamValues.StreamValuesItem;

export default streamValues;
export {streamValues};
export type {StreamValuesItem};
