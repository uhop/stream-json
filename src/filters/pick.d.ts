import {Duplex} from 'node:stream';
import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import filterBase from './filter-base';

export = pick;

declare function pick(options?: filterBase.FilterBaseOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace pick {
  export function withParser(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Flushable<string, any>;
  export function withParserAsStream(options?: filterBase.FilterBaseOptions & parser.ParserOptions): Duplex;
  export {pick};
}
