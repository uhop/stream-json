import {Duplex} from 'node:stream';
import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import filterBase from './filter-base';

export = ignore;

/**
 * Removes matching subobjects from a token stream entirely.
 *
 * A convenience wrapper around `replace` with an empty replacement and
 * `allowEmptyReplacement` set to `true`. Requires packed keys from upstream.
 *
 * @param options - Filter options (`filter`, `once`, `pathSeparator`).
 */
declare function ignore(options?: filterBase.FilterBaseOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace ignore {
  /** Creates a `parser() + ignore()` pipeline as a flushable function. */
  export function withParser(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Flushable<string, any>;
  /** Creates a `parser() + ignore()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for destructuring. */
  export {ignore};
}
