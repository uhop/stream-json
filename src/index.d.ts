/// <reference types="node" />

import {Duplex} from 'node:stream';
import parser, {ParserOptions} from './parser';

/**
 * Creates a Parser stream decorated with {@link emit}, so tokens are emitted as events.
 *
 * @param options - Parser options (packing, streaming, JSON streaming).
 * @returns A Duplex stream that emits token events (`startObject`, `stringValue`, etc.).
 */
declare function make(options?: ParserOptions): Duplex;

declare namespace make {
  /** The underlying parser factory (without `emit()` decoration). */
  export {parser};
}

export = make;
