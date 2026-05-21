/// <reference types="node" />

import {Duplex} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import parser from '../parser.js';
import filterBase from './filter-base.js';

/**
 * Removes matching subobjects from a token stream entirely.
 *
 * A convenience wrapper around `replace` with an empty replacement and
 * `allowEmptyReplacement` set to `true`. Requires packed keys from upstream.
 *
 * @param options - Filter options (`filter`, `once`, `pathSeparator`).
 */
declare function ignore(options?: filterBase.FilterBaseOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace ignore {
  /** Creates an ignore filter as a Duplex stream. */
  export function asStream(options?: filterBase.FilterBaseOptions): Duplex;
  /** Creates a `parser() + ignore()` pipeline as a flushable function. */
  export function withParser(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Flushable<string, any>;
  /** Creates a `parser() + ignore()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for `ignore.ignore === ignore`. */
  export const ignore: typeof import('./ignore.js').default;
}

export default ignore;
export {ignore};
