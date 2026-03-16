import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';

export = filterBase;

declare function filterBase(
  config?: filterBase.FilterBaseConfig
): (options?: filterBase.FilterBaseOptions) => Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace filterBase {
  export interface FilterBaseOptions {
    filter?: ((stack: (string | number | null)[]) => boolean) | string | RegExp;
    once?: boolean;
    pathSeparator?: string;
    streamValues?: boolean;
    streamKeys?: boolean;
    packKeys?: boolean;
  }

  export interface FilterBaseConfig {
    specialAction?: string;
    defaultAction?: string;
    nonCheckableAction?: string;
    transition?: (
      stack: (string | number | null)[],
      chunk: parser.Token | null,
      action: string,
      options: FilterBaseOptions
    ) => Many<parser.Token> | typeof none | void;
  }

  export function makeStackDiffer(
    previousStack?: (string | number | null)[]
  ): (stack: (string | number | null)[], chunk: parser.Token | null, options?: FilterBaseOptions) => Many<parser.Token>;
  export {filterBase};
}
