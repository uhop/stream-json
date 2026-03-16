import {Duplex} from 'node:stream';
import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import filterBase from './filter-base';

export = replace;

declare function replace(options?: replace.ReplaceOptions): Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace replace {
  export interface ReplaceOptions extends filterBase.FilterBaseOptions {
    replacement?:
      | ((
          stack: (string | number | null)[],
          chunk: parser.Token,
          options: filterBase.FilterBaseOptions
        ) => parser.Token | parser.Token[] | Many<parser.Token> | typeof none)
      | parser.Token[]
      | Many<parser.Token>
      | object
      | null;
  }
  export function withParser(options?: ReplaceOptions & parser.ParserOptions): Flushable<string, any>;
  export function withParserAsStream(options?: ReplaceOptions & parser.ParserOptions): Duplex;
  export {replace};
}
