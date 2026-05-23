import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import filterBase from './filter-base.js';

/**
 * Removes matching subobjects from a token stream entirely.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/filters/ignore.js`; for the Web-only entry import from
 * `stream-json/web/filters/ignore.js`.
 *
 * @param options - Filter options (`filter`, `once`, `pathSeparator`).
 */
declare function ignore(options?: filterBase.FilterBaseOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace ignore {
  /** Creates a `parser() + ignore()` pipeline as a flushable function. */
  export function withParser(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Flushable<string, parser.Token | Many<parser.Token> | typeof none>;
  /** Self-reference for `ignore.ignore === ignore`. */
  export const ignore: typeof import('./ignore.js').default;
}

export default ignore;
export {ignore};
