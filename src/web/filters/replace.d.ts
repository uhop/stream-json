import type {ReplaceOptions as CoreReplaceOptions} from '../../core/filters/replace.js';
import type parser from '../../core/parser.js';

/**
 * Replaces matching subobjects in a token stream with a replacement value.
 *
 * Web-flavored entry: the returned factory has only `replace.asWebStream(options)` and
 * `replace.withParserAsWebStream(options)` attached.
 *
 * @param options - Filter and replacement options.
 */
declare function replace(options?: replace.ReplaceOptions): ReturnType<typeof import('../../core/filters/replace.js').default>;

declare namespace replace {
  /** Options for `replace`. */
  export type ReplaceOptions = CoreReplaceOptions;
  /** Creates a replace filter wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: ReplaceOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser() + replace()` pipeline as a flushable function. */
  export function withParser(options?: ReplaceOptions & parser.ParserOptions): any;
  /** Creates a `parser() + replace()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: ReplaceOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `replace.replace === replace`. */
  export const replace: typeof import('./replace.js').default;
}

type ReplaceOptions = replace.ReplaceOptions;

export default replace;
export {replace};
export type {ReplaceOptions};
