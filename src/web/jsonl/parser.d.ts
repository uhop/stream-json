import type {JsonlParserOptions as CoreJsonlParserOptions, JsonlItem as CoreJsonlItem} from '../../core/jsonl/parser.js';

/**
 * Creates a JSONL (line-delimited JSON) parser as a generator pipeline.
 *
 * Web-flavored entry: the returned factory has only `jsonlParser.asWebStream(options)` attached.
 *
 * @param options - Parser configuration including reviver and error handling.
 * @returns A generator pipeline function for use in a `chain()` pipeline.
 */
declare function jsonlParser(options?: jsonlParser.JsonlParserOptions): ReturnType<typeof import('../../core/jsonl/parser.js').default>;

declare namespace jsonlParser {
  /** Options for the JSONL parser. */
  export type JsonlParserOptions = CoreJsonlParserOptions;
  /** An item emitted by the JSONL parser. */
  export type JsonlItem = CoreJsonlItem;
  /** Creates a JSONL parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: JsonlParserOptions): {readable: ReadableStream; writable: WritableStream};
  /** Parses a single JSON line, returning the parsed value or `errorIndicator` on failure. */
  export function checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: any): any;
  /** Self-reference for `jsonlParser.jsonlParser === jsonlParser`. */
  export const jsonlParser: typeof import('./parser.js').default;
  /** Self-reference for `jsonlParser.parser === jsonlParser`. */
  export const parser: typeof import('./parser.js').default;
}

type JsonlParserOptions = jsonlParser.JsonlParserOptions;
type JsonlItem = jsonlParser.JsonlItem;
declare function checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: any): any;

export default jsonlParser;
export {jsonlParser, jsonlParser as parser, checkedParse};
export type {JsonlParserOptions, JsonlItem};
