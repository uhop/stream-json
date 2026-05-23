import type {BatchOptions as CoreBatchOptions} from '../../core/utils/batch.js';

/**
 * Creates a flushable batch function that groups incoming items into arrays.
 *
 * Web-flavored entry: the returned factory has only `batch.asWebStream(options)` attached.
 * No Node-stream imports are pulled in via this subpath.
 *
 * @param options - Batch configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function batch(options?: batch.BatchOptions): ReturnType<typeof import('../../core/utils/batch.js').default>;

declare namespace batch {
  /** Options for Batch. */
  export type BatchOptions = CoreBatchOptions;

  /** A `{readable, writable}` pair with an exposed `_batchSize` property. */
  export type BatchWebStream = {readable: ReadableStream; writable: WritableStream; _batchSize: number};

  /**
   * Creates a batch Web stream pair with `_batchSize` attached.
   *
   * @param options - Batch configuration.
   * @returns A `{readable, writable, _batchSize}` pair.
   */
  export function asWebStream(options?: BatchOptions): BatchWebStream;
  /** Self-reference for `batch.batch === batch`. */
  export const batch: typeof import('./batch.js').default;
}

type BatchOptions = batch.BatchOptions;
type BatchWebStream = batch.BatchWebStream;

/** Normalizes a `batchSize` option to a positive integer (default `1000`, minimum `1`). */
declare function parseBatchSize(options?: BatchOptions): number;

export default batch;
export {batch, parseBatchSize};
export type {BatchOptions, BatchWebStream};
