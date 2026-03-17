import {Duplex} from 'node:stream';
import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import filterBase from './filter-base';

export = pick;

/**
 * Picks matching subobjects from a token stream, ignoring the rest.
 *
 * Unless it picks exactly one object, the output is a stream of values
 * (like JSON Streaming) — typically piped through `streamValues()`.
 *
 * @param options - Filter options (`filter`, `once`, `pathSeparator`).
 */
declare function pick(options?: filterBase.FilterBaseOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace pick {
  /** Creates a pick filter as a Duplex stream. */
  export function asStream(options?: filterBase.FilterBaseOptions): Duplex;
  /** Creates a `parser() + pick()` pipeline as a flushable function. */
  export function withParser(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Flushable<string, any>;
  /** Creates a `parser() + pick()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for destructuring. */
  export {pick};
}
