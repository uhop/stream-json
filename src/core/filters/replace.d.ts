import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import filterBase from './filter-base.js';

/**
 * Replaces matching subobjects in a token stream with a replacement value.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/filters/replace.js`; for the Web-only entry import from
 * `stream-json/web/filters/replace.js`.
 *
 * @param options - Filter and replacement options.
 */
declare function replace(options?: replace.ReplaceOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace replace {
  /** Options for `replace`, extending filter base options with a replacement value. */
  export interface ReplaceOptions extends filterBase.FilterBaseOptions {
    /**
     * What to substitute for matched subobjects.
     * - **function** — called with `(stack, chunk, options)`; returns tokens.
     * - **Token[]** — a static array of replacement tokens.
     * - **object / null** — disassembled into tokens automatically.
     * - Default: `[{name: 'nullValue', value: null}]`.
     */
    replacement?:
      | ((
          stack: (string | number | null)[],
          chunk: parser.Token,
          options: filterBase.FilterBaseOptions
        ) => parser.Token | parser.Token[] | Many<parser.Token> | typeof none)
      | parser.Token[]
      | Many<parser.Token>
      | object
      | null;
  }
  /** Creates a `parser() + replace()` pipeline as a flushable function. */
  export function withParser(options?: ReplaceOptions & parser.ParserOptions): Flushable<string, any>;
  /** Self-reference for `replace.replace === replace`. */
  export const replace: typeof import('./replace.js').default;
}

type ReplaceOptions = replace.ReplaceOptions;

export default replace;
export {replace};
export type {ReplaceOptions};
