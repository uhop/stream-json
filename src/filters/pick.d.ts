/// <reference types="node" />

import {Duplex} from 'node:stream';
import type filterBase from '../core/filters/filter-base.js';
import type parser from '../core/parser.js';

/**
 * Picks matching subobjects from a token stream, ignoring the rest.
 *
 * Node-flavored entry: the returned factory has both `pick.asStream(options)`
 * (Node Duplex) and `pick.asWebStream(options)` (Web `{readable, writable}` pair) attached,
 * plus `withParserAsStream` / `withParserAsWebStream` parser-included variants.
 *
 * @param options - Filter options (`filter`, `once`, `pathSeparator`).
 */
declare function pick(options?: filterBase.FilterBaseOptions): ReturnType<typeof import('../core/filters/pick.js').default>;

declare namespace pick {
  /** Creates a pick filter wrapped as a Node Duplex stream. */
  export function asStream(options?: filterBase.FilterBaseOptions): Duplex;
  /** Creates a pick filter wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: filterBase.FilterBaseOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a `parser() + pick()` pipeline as a flushable function. */
  export function withParser(options?: filterBase.FilterBaseOptions & parser.ParserOptions): any;
  /** Creates a `parser() + pick()` pipeline as a Node Duplex stream. */
  export function withParserAsStream(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Duplex;
  /** Creates a `parser() + pick()` pipeline as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: filterBase.FilterBaseOptions & parser.ParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `pick.pick === pick`. */
  export const pick: typeof import('./pick.js').default;
}

export default pick;
export {pick};
