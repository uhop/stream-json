/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, none} from 'stream-chain/defs.js';

/**
 * Creates a flushable batch function that groups incoming items into arrays.
 *
 * Node-flavored entry: the returned factory has both `batch.asStream(options)`
 * (Node Duplex) and `batch.asWebStream(options)` (Web pair) attached.
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
  /** Creates a batch Web stream pair. */
  export function asWebStream(options?: BatchOptions): {readable: ReadableStream; writable: WritableStream};
  /** Self-reference for `batch.batch === batch`. */
  export const batch: typeof import('./batch.js').default;
}

type BatchOptions = batch.BatchOptions;
type BatchStream = batch.BatchStream;

/** Normalizes a `batchSize` option to a positive integer (default `1000`, minimum `1`). */
declare function parseBatchSize(options?: BatchOptions): number;

export default batch;
export {batch, parseBatchSize};
export type {BatchOptions, BatchStream};
