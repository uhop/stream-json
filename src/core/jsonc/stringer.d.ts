import {Flushable, none} from 'stream-chain/defs.js';

/**
 * Creates a flushable function that converts a token stream (including JSONC
 * `whitespace` and `comment` tokens) back into JSONC text.
 *
 * Base tokens are handled identically to `stringer`. Whitespace and comment
 * tokens are output verbatim.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/jsonc/stringer.js`; for the Web-only entry import from
 * `stream-json/web/jsonc/stringer.js`.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.JsoncStringerOptions): Flushable<any, string | typeof none>;

declare namespace stringer {
  /** Options for the JSONC Stringer. */
  export interface JsoncStringerOptions {
    /** Initial value for `useKeyValues`, `useStringValues`, and `useNumberValues`. */
    useValues?: boolean;
    /** Use packed `keyValue` tokens instead of streamed key chunks. Default: `false`. */
    useKeyValues?: boolean;
    /** Use packed `stringValue` tokens instead of streamed string chunks. Default: `false`. */
    useStringValues?: boolean;
    /** Use packed `numberValue` tokens instead of streamed number chunks. Default: `false`. */
    useNumberValues?: boolean;
    /** Wrap all incoming JSON values in an array. Default: `false`. */
    makeArray?: boolean;
  }

  /** Self-reference for backwards compat: `import {stringer} from 'stream-json/core/jsonc/stringer.js'`. */
  export const stringer: typeof import('./stringer.js').default;
}

type JsoncStringerOptions = stringer.JsoncStringerOptions;

export default stringer;
export {stringer, stringer as jsoncStringer};
export type {JsoncStringerOptions};
