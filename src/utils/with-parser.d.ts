/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {ParserOptions} from '../parser';

/**
 * Creates a pipeline of `parser()` piped into a component created by `fn`.
 *
 * Most stream-json components expose `.withParser()` as a static method
 * built on this utility.
 *
 * @param fn - A factory function that takes options and returns a stream component.
 * @param options - Shared options passed to both the parser and `fn`.
 */
declare function withParser(fn: (options?: any) => any, options?: ParserOptions): any;

declare namespace withParser {
  /** Same as `withParser()` but returns the pipeline wrapped as a Duplex stream. */
  export function asStream(fn: (options?: any) => any, options?: ParserOptions & DuplexOptions): Duplex;
}

export = withParser;
