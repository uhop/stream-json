import {Duplex} from 'node:stream';
import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import filterBase from './filter-base';

export = filter;

declare function filter(options?: filter.FilterOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace filter {
  export interface FilterOptions extends filterBase.FilterBaseOptions {
    acceptObjects?: boolean;
  }
  export function withParser(options?: FilterOptions & parser.ParserOptions): Flushable<string, any>;
  export function withParserAsStream(options?: FilterOptions & parser.ParserOptions): Duplex;
  export {filter};
}
