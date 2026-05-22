import {ParserOptions} from '../../core/parser.js';

/**
 * Creates a pipeline of `parser()` piped into a component created by `fn`.
 *
 * Web-flavored entry: the returned factory has only `withParser.asWebStream(...)` attached.
 *
 * @param fn - A factory function that takes options and returns a stream component.
 * @param options - Shared options passed to both the parser and `fn`.
 */
declare function withParser(fn: (options?: any) => any, options?: ParserOptions): any;

declare namespace withParser {
  /** Same as `withParser()` but returns the pipeline wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(fn: (options?: any) => any, options?: ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `withParser.withParser === withParser`. */
  export const withParser: typeof import('./with-parser.js').default;
}

export default withParser;
export {withParser};
