import type {FilterOptions as CoreFilterOptions} from '../../core/filters/filter.js';
import type parser from '../../core/parser.js';

/**
 * Filters subobjects from a token stream while preserving the original JSON shape.
 *
 * Web-flavored entry: the returned factory has only `filter.asWebStream(options)` and
 * `filter.withParserAsWebStream(options)` attached.
 *
 * @param options - Filter options including `acceptObjects`.
 */
declare function filter(options?: filter.FilterOptions): ReturnType<typeof import('../../core/filters/filter.js').default>;

declare namespace filter {
  /** Options for `filter`. */
  export type FilterOptions = CoreFilterOptions;
  /** Creates a filter wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: FilterOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser() + filter()` pipeline as a flushable function. */
  export function withParser(options?: FilterOptions & parser.ParserOptions): ReturnType<typeof import('../../core/filters/filter.js').default.withParser>;
  /** Creates a `parser() + filter()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: FilterOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `filter.filter === filter`. */
  export const filter: typeof import('./filter.js').default;
}

type FilterOptions = filter.FilterOptions;

export default filter;
export {filter};
export type {FilterOptions};
