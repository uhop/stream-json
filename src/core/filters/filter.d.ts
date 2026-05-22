import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import filterBase from './filter-base.js';

/**
 * Filters subobjects from a token stream while preserving the original JSON shape.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/filters/filter.js`; for the Web-only entry import from
 * `stream-json/web/filters/filter.js`.
 *
 * @param options - Filter options including `acceptObjects`.
 */
declare function filter(options?: filter.FilterOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace filter {
  /** Options for `filter`, extending filter base options. */
  export interface FilterOptions extends filterBase.FilterBaseOptions {
    /** If `true`, accept entire objects/arrays when the filter matches. Default: `false`. */
    acceptObjects?: boolean;
  }
  /** Creates a `parser() + filter()` pipeline as a flushable function. */
  export function withParser(options?: FilterOptions & parser.ParserOptions): Flushable<string, any>;
  /** Self-reference for `filter.filter === filter`. */
  export const filter: typeof import('./filter.js').default;
}

type FilterOptions = filter.FilterOptions;

export default filter;
export {filter};
export type {FilterOptions};
