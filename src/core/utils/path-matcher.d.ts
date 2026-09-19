/**
 * Internal: incremental path matching shared by `filterBase` and `FlexAssembler`.
 * Not part of the public API.
 *
 * Decides what `stack.join(separator)` matching decides, without joining on every check:
 * - **string** — keeps a prefix-match state per stack level; a check costs O(key length).
 * - **RegExp** — keeps the joined path per level; a check builds one string from the parent.
 * - **function** — becomes `test` itself and receives the stack as is.
 */
declare class PathMatcher {
  /**
   * @param filter - A string (exact or prefix match), a RegExp, or a predicate. Anything else matches everything.
   * @param separator - Path separator. Default: `'.'`.
   */
  constructor(filter?: unknown, separator?: string);

  /** `false` for a predicate filter: `extend()` records nothing and can be skipped. */
  stateful: boolean;

  /** Records the state of the whole stack. Call it before a nested level is pushed. */
  extend(stack: readonly unknown[]): void;

  /**
   * Tests the whole stack. The last level is derived from the state recorded for its parent.
   *
   * @param stack - The current path.
   * @param chunk - Passed to a predicate filter.
   * @returns `true` when the path matches.
   */
  test(stack: readonly unknown[], chunk?: unknown): boolean;

  /**
   * Tests the whole stack from the state `extend(stack)` recorded for it.
   *
   * @param stack - The current path, already passed to `extend()`.
   * @returns `true` when the path matches.
   */
  testRecorded(stack: readonly unknown[]): boolean;
}

export default PathMatcher;
export {PathMatcher};
