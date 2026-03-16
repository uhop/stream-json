import {Duplex} from 'node:stream';
import parser from '../parser';
import streamBase from './stream-base';
import {none} from 'stream-chain/defs.js';

export = streamArray;

declare function streamArray(options?: streamBase.StreamBaseOptions): (chunk: parser.Token) => streamArray.StreamArrayItem | typeof none;

declare namespace streamArray {
  export interface StreamArrayItem {
    key: number;
    value: any;
  }
  export function withParser(options?: streamBase.StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  export function withParserAsStream(options?: streamBase.StreamBaseOptions & parser.ParserOptions): Duplex;
  export {streamArray};
}
