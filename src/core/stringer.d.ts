import {Flushable, none} from 'stream-chain/defs.js';
import parser from './parser.js';

/**
 * Creates a flushable function that converts a token stream into JSON text.
 *
 * If `Parser` is `JSON.parse()`, then `Stringer` is `JSON.stringify()` for token streams.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/stringer.js`; for the Web-only entry import from
 * `stream-json/web/stringer.js`.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.StringerOptions): Flushable<parser.Token, string | typeof none>;

declare namespace stringer {
  /** Options for the Stringer. */
  export interface StringerOptions {
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

  /** Self-reference for `stringer.stringer === stringer`. */
  export const stringer: typeof import('./stringer.js').default;
}

type StringerOptions = stringer.StringerOptions;

export default stringer;
export {stringer};
export type {StringerOptions};
