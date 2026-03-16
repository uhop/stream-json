/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';

export = parser;

declare function parser(options?: parser.ParserOptions): Flushable<string, Many<parser.Token> | typeof none>;

declare namespace parser {
  export interface Token {
    name: string;
    value?: any;
  }

  export interface ParserOptions extends DuplexOptions {
    packValues?: boolean;
    packKeys?: boolean;
    packStrings?: boolean;
    packNumbers?: boolean;
    streamValues?: boolean;
    streamKeys?: boolean;
    streamStrings?: boolean;
    streamNumbers?: boolean;
    jsonStreaming?: boolean;
  }

  export function asStream(options?: ParserOptions): Duplex;
  export {parser};
}
