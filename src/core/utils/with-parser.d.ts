import type {Flushable} from 'stream-chain/defs.js';

import type {ParserOptions, Token} from '../parser.js';

/**
 * Creates a pipeline of `parser()` piped into a component created by `fn`.
 *
 * Most stream-json components expose `.withParser()` as a static method
 * built on this utility.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-json/utils/with-parser.js`; for the Web-only entry import from
 * `stream-json/web/utils/with-parser.js`.
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
  /** Self-reference for `withParser.withParser === withParser`. */
  export const withParser: typeof import('./with-parser.js').default;
}

export default withParser;
export {withParser};
