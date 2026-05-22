/**
 * Creates a JSONL (line-delimited JSON) stringer as a Web Streams
 * `TransformStream`. Each incoming object is serialized with `JSON.stringify()`
 * and separated by a configurable separator (default: `'\n'`).
 *
 * Web-flavored entry — no Node-stream imports pulled in via this subpath.
 *
 * @param options - Stringer configuration.
 * @returns A `TransformStream<T, string>`.
 */
declare function jsonlStringer<T = any>(options?: jsonlStringer.JsonlStringerOptions): TransformStream<T, string>;

declare namespace jsonlStringer {
  /** Options for the JSONL stringer (Web Streams flavor). */
  export interface JsonlStringerOptions {
    /** A `JSON.stringify()` replacer. */
    replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (string | number)[];
    /** Line separator between JSON values. Default: `'\n'`. */
    separator?: string;
    /** String prepended before the first value. Default: `''`. */
    prefix?: string;
    /** String appended after the last value on flush. Default: `''`. */
    suffix?: string;
    /** `JSON.stringify()` space argument for pretty-printing. */
    space?: string | number;
    /** String to emit when the stream ends without any values. */
    emptyValue?: string;
    /** Queuing strategy applied to both sides if no side-specific strategy is given. */
    strategy?: QueuingStrategy;
    /** Optional `QueuingStrategy` for the writable side. Overrides `strategy`. */
    writableStrategy?: QueuingStrategy<unknown>;
    /** Optional `QueuingStrategy` for the readable side. Overrides `strategy`. */
    readableStrategy?: QueuingStrategy<string>;
  }

  /** Creates a JSONL stringer as a Web Streams `TransformStream`. */
  export function asWebStream<T = any>(options?: JsonlStringerOptions): TransformStream<T, string>;
  /** Self-reference for `jsonlStringer.jsonlStringer === jsonlStringer`. */
  export const jsonlStringer: typeof import('./stringer.js').default;
  /** Self-reference for `jsonlStringer.stringer === jsonlStringer`. */
  export const stringer: typeof import('./stringer.js').default;
}

type JsonlStringerOptions = jsonlStringer.JsonlStringerOptions;

export default jsonlStringer;
export {jsonlStringer, jsonlStringer as stringer};
export type {JsonlStringerOptions};
