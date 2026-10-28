import {Flushable, Many, none, stop} from 'stream-chain/defs.js';
import parser from '../parser.js';
import filterBase from './filter-base.js';

/**
 * Picks matching subobjects from a token stream, ignoring the rest.
 * Key-based paths need packed keys (`keyValue`) from upstream — the parser's default.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/filters/pick.js`; for the Web-only entry import from
 * `stream-json/web/filters/pick.js`.
 *
 * With `once`, it returns `stop` after its match, ending the pipeline.
 *
 * @param options - Filter options (`filter`, `once`, `pathSeparator`).
 */
declare function pick(options?: filterBase.FilterBaseOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none | typeof stop>;

declare namespace pick {
  /** Creates a `parser() + pick()` pipeline as a flushable function. */
  export function withParser(
    options?: filterBase.FilterBaseOptions & parser.ParserOptions
  ): Flushable<string, parser.Token | Many<parser.Token> | typeof none | typeof stop>;
  /** Self-reference for `pick.pick === pick`. */
  export const pick: typeof import('./pick.js').default;
}

export default pick;
export {pick};
