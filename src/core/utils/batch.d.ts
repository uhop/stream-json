import {Flushable, none} from 'stream-chain/defs.js';

/**
 * Creates a flushable batch function that groups incoming items into arrays.
 *
 * Useful as a performance optimization: downstream consumers receive
 * batches of items instead of one at a time.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream`
 * adapters attached. For the Node-flavored entry import from
 * `stream-json/utils/batch.js`; for the Web entry import from
 * `stream-json/web/utils/batch.js`.
 *
 * @param options - Batch configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function batch<T = unknown>(options?: batch.BatchOptions): Flushable<T, T[] | typeof none>;

declare namespace batch {
  /** Options for Batch. */
  export interface BatchOptions {
    /** Number of items per batch. Default: `1000`. */
    batchSize?: number;
  }

  /** Self-reference for `batch.batch === batch`. */
  export const batch: typeof import('./batch.js').default;
}

type BatchOptions = batch.BatchOptions;

/** Normalizes a `batchSize` option to a positive integer (default `1000`, minimum `1`). */
declare function parseBatchSize(options?: BatchOptions): number;

export default batch;
export {batch, parseBatchSize};
export type {BatchOptions};
