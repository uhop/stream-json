/**
 * Creates an `EventTarget` sink for a token stream.
 *
 * The returned target exposes a `.writable` `WritableStream` that accepts
 * `{name, value}` tokens; each token is dispatched as a `CustomEvent` with
 * `event.type === chunk.name` and `event.detail === chunk.value`.
 *
 * Web-flavored counterpart to the Node `emitter` (which is a `Writable` that
 * uses EventEmitter `.emit`). EventTarget + CustomEvent are universal across
 * Node 22+, Bun, Deno, and browsers, so no polyfill is needed.
 *
 * @param options - Optional configuration.
 * @returns An `EventTarget` with a `.writable` `WritableStream` attached.
 */
declare function emitter(options?: emitter.EmitterOptions): emitter.EmitterTarget;

declare namespace emitter {
  /** Options for the Web emitter. */
  export interface EmitterOptions {
    /** Queuing strategy applied to the writable side. */
    strategy?: QueuingStrategy<{name: string; value?: unknown}>;
  }

  /** `EventTarget` with a `WritableStream` sink attached. */
  export interface EmitterTarget extends EventTarget {
    /** Accepts `{name, value}` tokens. Each token dispatches a `CustomEvent`. */
    writable: WritableStream<{name: string; value?: unknown}>;
  }

  /** Self-alias for `emitter.asWebStream === emitter`. */
  export const asWebStream: typeof emitter;
  /** Self-reference for `emitter.emitter === emitter`. */
  export const emitter: typeof import('./emitter.js').default;
}

type EmitterOptions = emitter.EmitterOptions;
type EmitterTarget = emitter.EmitterTarget;

export default emitter;
export {emitter};
export type {EmitterOptions, EmitterTarget};
