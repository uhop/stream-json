/// <reference types="node" />

import {Duplex} from 'node:stream';
import parser, {ParserOptions} from './parser.js';

/**
 * Creates a JSON parser as a Duplex stream.
 *
 * Convenience alias for `parser.asStream(options)`: the writable side accepts
 * text (Buffer/string), the readable side emits `{name, value}` token objects.
 *
 * @param options - Parser options (packing, streaming, JSON streaming).
 * @returns A Duplex stream that produces a SAX-like token stream.
 */
declare function parserStream(options?: ParserOptions): Duplex;

export default parserStream;
export {parserStream, parser};
