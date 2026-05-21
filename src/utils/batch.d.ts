/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, none} from 'stream-chain/defs.js';

/**
 * Creates a flushable batch function that groups incoming items into arrays.
 *
 * Useful as a performance optimization: downstream consumers receive
 * batches of items instead of one at a time.
 *
 * @param options - Batch configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function batch(options?: batch.BatchOptions): Flushable<any, any[] | typeof none>;

declare namespace batch {
  /** Options for Batch. Extends Node.js `DuplexOptions`. */
  export interface BatchOptions extends DuplexOptions {
    /** Number of items per batch. Default: `1000`. */
    batchSize?: number;
  }

  /** A Duplex stream with an exposed `_batchSize` property. */
  export type BatchStream = Duplex & {_batchSize: number};

  /** Creates a batch Duplex stream. */
  export function asStream(options?: BatchOptions): BatchStream;
  /** Self-reference for `batch.batch === batch`. */
  export const batch: typeof import('./batch.js').default;
}

type BatchOptions = batch.BatchOptions;
type BatchStream = batch.BatchStream;

export default batch;
export {batch};
export type {BatchOptions, BatchStream};
