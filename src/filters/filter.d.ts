import {Duplex} from 'node:stream';
import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import filterBase from './filter-base';

export = filter;

/**
 * Filters subobjects from a token stream while preserving the original JSON shape.
 *
 * Unlike `pick`, which strips the surrounding structure, `filter` recreates
 * parent objects so the output remains a valid subset of the original.
 * Requires packed keys from upstream.
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
  /** Creates a filter as a Duplex stream. */
  export function asStream(options?: FilterOptions): Duplex;
  /** Creates a `parser() + filter()` pipeline as a flushable function. */
  export function withParser(options?: FilterOptions & parser.ParserOptions): Flushable<string, any>;
  /** Creates a `parser() + filter()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: FilterOptions & parser.ParserOptions): Duplex;
  /** Self-reference for destructuring. */
  export {filter};
}
