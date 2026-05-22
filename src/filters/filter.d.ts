/// <reference types="node" />

import {Duplex} from 'node:stream';
import type {FilterOptions as CoreFilterOptions} from '../core/filters/filter.js';
import type parser from '../core/parser.js';

/**
 * Filters subobjects from a token stream while preserving the original JSON shape.
 *
 * Node-flavored entry: the returned factory has both `filter.asStream(options)`
 * (Node Duplex) and `filter.asWebStream(options)` (Web `{readable, writable}` pair) attached,
 * plus `withParserAsStream` / `withParserAsWebStream` parser-included variants.
 *
 * @param options - Filter options including `acceptObjects`.
 */
declare function filter(options?: filter.FilterOptions): ReturnType<typeof import('../core/filters/filter.js').default>;

declare namespace filter {
  /** Options for `filter`. */
  export type FilterOptions = CoreFilterOptions;
  /** Creates a filter wrapped as a Node Duplex stream. */
  export function asStream(options?: FilterOptions): Duplex;
  /** Creates a filter wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: FilterOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser() + filter()` pipeline as a flushable function. */
  export function withParser(options?: FilterOptions & parser.ParserOptions): any;
  /** Creates a `parser() + filter()` pipeline as a Node Duplex stream. */
  export function withParserAsStream(options?: FilterOptions & parser.ParserOptions): Duplex;
  /** Creates a `parser() + filter()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: FilterOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `filter.filter === filter`. */
  export const filter: typeof import('./filter.js').default;
}

type FilterOptions = filter.FilterOptions;

export default filter;
export {filter};
export type {FilterOptions};
