/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

export = Batch;

declare class Batch extends Transform {
  static make(options?: Batch.BatchOptions): Batch;
  static batch(options?: Batch.BatchOptions): Batch;
  static withParser(options?: Batch.BatchOptions): any;
  constructor(options?: Batch.BatchOptions);
  _batchSize: number;
}

declare namespace Batch {
  export interface BatchOptions extends TransformOptions {
    batchSize?: number;
  }
}
