import parser from '../parser';
import {Flushable, Many, none} from 'stream-chain/defs.js';

export = filterBase;

/**
 * Creates a configurable token-stream filter.
 *
 * `filterBase` is the foundation for all filters (`pick`, `replace`, `ignore`, `filter`).
 * It tracks the JSON path stack and applies accept/reject actions based on a `filter` option.
 *
 * @param config - Internal configuration defining filter behavior (actions, transitions).
 * @returns A factory that takes user-facing options and returns a flushable filter function.
 */
declare function filterBase(
  config?: filterBase.FilterBaseConfig
): (options?: filterBase.FilterBaseOptions) => Flushable<parser.Token, parser.Token | Many<parser.Token> | typeof none>;

declare namespace filterBase {
  /** User-facing options shared by all filters. */
  export interface FilterBaseOptions {
    /**
     * Selects which subobjects to act on.
     * - **string** — matches by path (using `pathSeparator`), prefix-aware.
     * - **RegExp** — tested against the joined path string.
     * - **function** — called with `(stack, chunk)`; returns truthy to match.
     * - Default: `() => true`.
     */
    filter?: ((stack: (string | number | null)[], chunk: parser.Token) => boolean) | string | RegExp;
    /** Act only on the first match, then pass everything through. Default: `false`. */
    once?: boolean;
    /** Separator used when joining the stack into a path string. Default: `'.'`. */
    pathSeparator?: string;
    /** Initial value for `streamKeys`. Controls streaming of replayed keys. */
    streamValues?: boolean;
    /** Emit streaming key tokens (`startKey`/`stringChunk`/`endKey`) when replaying delayed keys. */
    streamKeys?: boolean;
    /** Expect packed `keyValue` tokens from upstream. */
    packKeys?: boolean;
  }

  /** Internal configuration that defines the behavior of a concrete filter. */
  export interface FilterBaseConfig {
    /** Action when the filter matches (e.g., `'accept'`, `'reject'`). */
    specialAction?: string;
    /** Action when the filter does not match (e.g., `'ignore'`, `'accept-token'`). */
    defaultAction?: string;
    /** Action when the path cannot be checked (no packed key yet). */
    nonCheckableAction?: string;
    /** Custom transition function called on each token to produce output. */
    transition?: (
      stack: (string | number | null)[],
      chunk: parser.Token | null,
      action: string,
      options: FilterBaseOptions
    ) => Many<parser.Token> | typeof none | void;
  }

  /**
   * Creates a function that generates structural tokens (start/end object/array, key)
   * to reconstruct the surrounding JSON envelope when filtering.
   */
  export function makeStackDiffer(
    previousStack?: (string | number | null)[]
  ): (stack: (string | number | null)[], chunk: parser.Token | null, options?: FilterBaseOptions) => Many<parser.Token>;
  /** Self-reference for destructuring. */
  export {filterBase};
}
