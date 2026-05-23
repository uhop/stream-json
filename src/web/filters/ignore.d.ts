import type filterBase from '../../core/filters/filter-base.js';
import type parser from '../../core/parser.js';

/**
 * Removes matching subobjects from a token stream entirely.
 *
 * Web-flavored entry: the returned factory has only `ignore.asWebStream(options)` and
 * `ignore.withParserAsWebStream(options)` attached.
 *
 * @param options - Filter options (`filter`, `once`, `pathSeparator`).
 */
declare function ignore(options?: filterBase.FilterBaseOptions): ReturnType<typeof import('../../core/filters/ignore.js').default>;

declare namespace ignore {
  /** Creates an ignore filter wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: filterBase.FilterBaseOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser() + ignore()` pipeline as a flushable function. */
  export function withParser(
    options?: filterBase.FilterBaseOptions & parser.ParserOptions
  ): ReturnType<typeof import('../../core/filters/ignore.js').default.withParser>;
  /** Creates a `parser() + ignore()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: filterBase.FilterBaseOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `ignore.ignore === ignore`. */
  export const ignore: typeof import('./ignore.js').default;
}

export default ignore;
export {ignore};
