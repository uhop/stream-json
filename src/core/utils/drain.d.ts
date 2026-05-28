/**
 * Drains an async iterable, returning its last yielded value (or `undefined`
 * if it yielded nothing).
 *
 * Use to run a `gen([…])(value)` pipeline whose output you don't otherwise
 * want. For sink-terminated chains (e.g. `gen([…, stringerToFile(path)])`)
 * the resolved value is `undefined`; for a single-final-value terminus
 * (an assembler-style stage that yields once) the yielded value is returned.
 *
 * @param source - An async iterable to drain.
 * @returns A promise resolving to the last yielded value, or `undefined`.
 */
declare function drain<T>(source: AsyncIterable<T>): Promise<T | undefined>;

export default drain;
export {drain};
