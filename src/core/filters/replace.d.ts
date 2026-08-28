import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import filterBase from './filter-base.js';

/**
 * Replaces matching subobjects in a token stream with a replacement value.
 * Needs packed keys (`keyValue`) from upstream to track paths and recreate parents — the
 * parser's default; replayed parent keys are always packed.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/filters/replace.js`; for the Web-only entry import from
 * `stream-json/web/filters/replace.js`.
 *
 * @param options - Filter and replacement options.
 */
declare function replace(options?: replace.ReplaceOptions): parser.TokenTransform;

declare namespace replace {
  /** Options for `replace`, extending filter base options with a replacement value. */
  export interface ReplaceOptions extends filterBase.FilterBaseOptions {
    /**
     * What to substitute for matched subobjects:
     * - a **function** `(stack, chunk, options)` — called per match; its result is
     *   interpreted like a static value below (`none` removes the value);
     * - a **token**, a **token array**, or a `Many` of tokens — substituted verbatim;
     * - **any other value** — a number, string, boolean, `null`, array, or plain
     *   object — disassembled into tokens once and substituted as that JSON value,
     *   shaped by the same packing/streaming options as the parser. An empty
     *   array is an empty token list and removes the value (kept for
     *   compatibility); an empty JSON array is `[{name: 'startArray'}, {name: 'endArray'}]`.
     * - Default (option absent): none — the matched value is removed, like `ignore`.
     */
    replacement?:
      | ((stack: (string | number | null)[], chunk: parser.Token, options: filterBase.FilterBaseOptions) => unknown)
      | parser.Token
      | parser.Token[]
      | Many<parser.Token>
      | {}
      | null;
  }
  /** Creates a `parser() + replace()` pipeline as a flushable function. */
  export function withParser(options?: ReplaceOptions & parser.ParserOptions): Flushable<string, parser.Token | Many<parser.Token> | typeof none>;
  /** Self-reference for `replace.replace === replace`. */
  export const replace: typeof import('./replace.js').default;
}

type ReplaceOptions = replace.ReplaceOptions;

export default replace;
export {replace};
export type {ReplaceOptions};
