import {Duplex} from 'node:stream';
import parser from '../parser';
import streamBase from './stream-base';
import {none} from 'stream-chain/defs.js';

export = streamObject;

declare function streamObject(options?: streamBase.StreamBaseOptions): (chunk: parser.Token) => streamObject.StreamObjectItem | typeof none;

declare namespace streamObject {
  export interface StreamObjectItem {
    key: string;
    value: any;
  }
  export function withParser(options?: streamBase.StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  export function withParserAsStream(options?: streamBase.StreamBaseOptions & parser.ParserOptions): Duplex;
  export {streamObject};
}
