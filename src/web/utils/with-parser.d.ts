import type {Flushable} from 'stream-chain/defs.js';

import type {ParserOptions, Token} from '../../core/parser.js';

/**
 * Creates a pipeline of `parser()` piped into a component created by `fn`.
 *
 * Web-flavored entry: the returned factory has only `withParser.asWebStream(...)` attached.
 *
 * Generic in `O` (the shape of `fn`'s options, inferred from `fn`) and `T`
 * (the downstream component's per-chunk output, inferred from `fn`'s return).
 * `NoInfer<O>` on `options` biases inference toward `fn` so a typed factory
 * isn't overridden by an inline options literal.
 *
 * @param fn - A factory function that takes options and returns a stream component.
 * @param options - Shared options passed to both the parser and `fn`.
 */
declare function withParser<O, T = unknown>(fn: (options?: O) => Flushable<Token, T>, options?: NoInfer<O> & ParserOptions): Flushable<string, T>;

declare namespace withParser {
  /** Same as `withParser()` but returns the pipeline wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream<O>(
    fn: (options?: O) => Flushable<Token, unknown>,
    options?: NoInfer<O> & ParserOptions
  ): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `withParser.withParser === withParser`. */
  export const withParser: typeof import('./with-parser.js').default;
}

export default withParser;
export {withParser};
