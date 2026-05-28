/**
 * One-shot single-value driver for a gen pipeline.
 *
 * Returns a function shaped like `gen(...stages)`, but the async generator it
 * produces drives the supplied value through the pipeline AND then flushes
 * it (equivalent to `g(value)` followed by `g(none)`). Without that flush,
 * sink flushables — notably the file writer in `stringerToFile` — never run
 * their `final()`.
 *
 * Each invocation constructs a fresh `gen` internally. For stages that carry
 * state (parsers, stringers, file writers), build a fresh `pipe` per use.
 *
 * Typical use: `await drain(pipe(stage1, stage2, …)(value))`.
 *
 * @param stages - The stages to drive (functions, flushables, or nested fLists).
 * @returns An async generator function: `(value) => AsyncGenerator<T>`.
 */
declare function pipe<T = unknown>(...stages: ReadonlyArray<unknown>): (value: unknown) => AsyncGenerator<T, void, unknown>;

export default pipe;
export {pipe};
