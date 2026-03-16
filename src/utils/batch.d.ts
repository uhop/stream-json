/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

export = Batch;

/**
 * Groups incoming items into arrays of a configurable size.
 *
 * Useful as a performance optimization: downstream consumers receive
 * batches of items instead of one at a time.
 */
declare class Batch extends Transform {
  /** Creates a new Batch instance. */
  static make(options?: Batch.BatchOptions): Batch;
  /** Alias of `make()`. */
  static batch(options?: Batch.BatchOptions): Batch;
  /** Creates a `parser() + batch()` pipeline. */
  static withParser(options?: Batch.BatchOptions): any;
  constructor(options?: Batch.BatchOptions);
  /** The configured batch size. */
  _batchSize: number;
}

declare namespace Batch {
  /** Options for Batch. Extends Node.js `TransformOptions`. */
  export interface BatchOptions extends TransformOptions {
    /** Number of items per batch. Default: `1000`. */
    batchSize?: number;
  }
}
