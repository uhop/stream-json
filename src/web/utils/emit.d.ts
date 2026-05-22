/**
 * Pipes a token-emitting `ReadableStream` into an `EventTarget` sink. Each
 * `{name, value}` token is dispatched as a `CustomEvent` with `event.type === chunk.name`
 * and `event.detail === chunk.value`.
 *
 * Web-flavored counterpart to the Node `emit` decorator (which uses EventEmitter
 * `.on` / `.emit` on the stream itself). Returns a fresh `EventTarget` rather
 * than decorating the input — Web `ReadableStream` has no event model to attach to.
 *
 * @param readable - A `ReadableStream<{name, value}>` (e.g. a parser's readable side).
 * @param options - Optional configuration.
 * @returns A new `EventTarget` receiving one `CustomEvent` per token.
 */
declare function emit(readable: ReadableStream<{name: string; value?: unknown}>, options?: emit.EmitOptions): EventTarget;

declare namespace emit {
  /** Options for the Web `emit`. */
  export interface EmitOptions {
    /** Queuing strategy applied to the internal writable side. */
    strategy?: QueuingStrategy<{name: string; value?: unknown}>;
  }
}

type EmitOptions = emit.EmitOptions;

export default emit;
export {emit};
export type {EmitOptions};
