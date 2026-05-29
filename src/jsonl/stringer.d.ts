/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

/**
 * Creates a JSONL (line-delimited JSON) stringer as a Transform stream.
 *
 * Each incoming object is serialized with `JSON.stringify()` and separated
 * by a configurable separator (default: `'\n'`).
 *
 * @deprecated Use stream-chain's JSONL stringer directly: `stream-chain/jsonl/stringerStream.js`
 * (Node Transform) or `stream-chain/jsonl/stringerWebStream.js` (Web `TransformStream`). stream-json's
 * JSONL is a thin re-export of stream-chain's and is slated for removal in a future major —
 * stream-json is a JSON *token* library, whereas JSONL yields whole objects per line and belongs
 * in stream-chain with the other substrate components.
 *
 * @param options - Stringer configuration.
 * @returns A Transform stream (writable side: objects, readable side: text).
 */
declare function stringer(options?: stringer.JsonlStringerOptions): Transform;

declare namespace stringer {
  /** Options for the JSONL stringer. Extends Node.js `TransformOptions`. */
  export interface JsonlStringerOptions extends TransformOptions {
    /** A `JSON.stringify()` replacer: a function or a property whitelist array. */
    replacer?: ((key: string, value: any) => any) | (string | number)[];
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
  }

  /** Options accepted by `asWebStream`. Same shape as the Node options minus Node's `TransformOptions`, plus Web Streams queuing strategies. */
  export interface JsonlStringerWebOptions {
    replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (string | number)[];
    separator?: string;
    prefix?: string;
    suffix?: string;
    space?: string | number;
    emptyValue?: string;
    /** Queuing strategy applied to both sides if no side-specific strategy is given. */
    strategy?: QueuingStrategy;
    /** Optional `QueuingStrategy` for the writable side. Overrides `strategy`. */
    writableStrategy?: QueuingStrategy<unknown>;
    /** Optional `QueuingStrategy` for the readable side. Overrides `strategy`. */
    readableStrategy?: QueuingStrategy<string>;
  }

  /** Creates a JSONL stringer as a Transform stream. */
  export function asStream(options?: JsonlStringerOptions): Transform;
  /** Creates a JSONL stringer as a Web Streams `TransformStream`. */
  export function asWebStream<T = any>(options?: JsonlStringerWebOptions): TransformStream<T, string>;
  /** Self-reference for backwards compat. */
  export const stringer: typeof import('./stringer.js').default;
}

type JsonlStringerOptions = stringer.JsonlStringerOptions;
type JsonlStringerWebOptions = stringer.JsonlStringerWebOptions;

export default stringer;
export {stringer, stringer as jsonlStringer};
export type {JsonlStringerOptions, JsonlStringerWebOptions};
