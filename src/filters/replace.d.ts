import {Duplex} from 'node:stream';
import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import filterBase from './filter-base';

export = replace;

/**
 * Replaces matching subobjects in a token stream with a replacement value.
 *
 * Non-matching tokens pass through unchanged. The default replacement is `null`.
 * Use `ignore` for removal without replacement.
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
  /** Creates a replace filter as a Duplex stream. */
  export function asStream(options?: ReplaceOptions): Duplex;
  /** Creates a `parser() + replace()` pipeline as a flushable function. */
  export function withParser(options?: ReplaceOptions & parser.ParserOptions): Flushable<string, any>;
  /** Creates a `parser() + replace()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: ReplaceOptions & parser.ParserOptions): Duplex;
  /** Self-reference for destructuring. */
  export {replace};
}
