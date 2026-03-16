import {Duplex} from 'node:stream';
import parser from '../parser';
import streamBase from './stream-base';
import {none} from 'stream-chain/defs.js';

export = streamValues;

declare function streamValues(options?: streamBase.StreamBaseOptions): (chunk: parser.Token) => streamValues.StreamValuesItem | typeof none;

declare namespace streamValues {
  export interface StreamValuesItem {
    key: number;
    value: any;
  }
  export function withParser(options?: streamBase.StreamBaseOptions & parser.ParserOptions): (chunk: string) => any;
  export function withParserAsStream(options?: streamBase.StreamBaseOptions & parser.ParserOptions): Duplex;
  export {streamValues};
}
