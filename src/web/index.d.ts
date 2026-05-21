import parser, {ParserOptions} from './parser.js';

/**
 * Web entry point — creates a JSON parser as a Web `TransformStream`-shaped pair.
 *
 * Convenience alias for `parser.asWebStream(options)` from `stream-json/web/parser.js`.
 * Pulls in no Node-specific dependencies; safe for browser bundles.
 *
 * @param options - Parser options (packing, streaming, JSON streaming).
 * @returns `{readable, writable}` — a `ReadableStream`/`WritableStream` pair.
 */
declare function parserWebStream(options?: ParserOptions): {readable: ReadableStream; writable: WritableStream};

export default parserWebStream;
export {parserWebStream, parser};
