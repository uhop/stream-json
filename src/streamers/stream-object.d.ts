import {Duplex} from 'node:stream';
import parser from '../parser';
import streamBase from './stream-base';
import {none} from 'stream-chain/defs.js';

export = streamObject;

/**
 * Streams top-level properties of a JSON object as `{key, value}` objects.
 *
 * Expects the token stream to represent a single object. Each property is
 * fully assembled in memory and emitted individually.
 *
 * @param options - Streamer options (assembler settings, `objectFilter`).
 */
declare function streamObject(options?: streamBase.StreamBaseOptions): (chunk: parser.Token) => streamObject.StreamObjectItem | typeof none;

declare namespace streamObject {
  /** An item emitted by `streamObject`: the property key and its assembled value. */
  export interface StreamObjectItem {
    /** Object property name. */
    key: string;
    /** The fully assembled JavaScript value. */
    value: any;
  }
  /** Creates a streamObject as a Duplex stream. */
  export function asStream(options?: streamBase.StreamBaseOptions): Duplex;
  /** Creates a `parser() + streamObject()` pipeline as a flushable function. */
  export function withParser(options?: streamBase.StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  /** Creates a `parser() + streamObject()` pipeline as a Duplex stream. */
  export function withParserAsStream(options?: streamBase.StreamBaseOptions & parser.ParserOptions): Duplex;
  /** Self-reference for destructuring. */
  export {streamObject};
}
