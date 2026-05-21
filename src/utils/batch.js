// @ts-self-types="./batch.d.ts"

import {asStream} from 'stream-chain';
import {asWebStream} from 'stream-chain/web';
import scBatch from 'stream-chain/utils/batch.js';

import batch, {parseBatchSize} from '../core/utils/batch.js';

/** @type {any} */ (batch).asStream = options => {
  const n = parseBatchSize(options);
  const stream = /** @type {any} */ (asStream(scBatch(n), {writableObjectMode: true, readableObjectMode: true, ...options}));
  stream._batchSize = n;
  return stream;
};

/** @type {any} */ (batch).asWebStream = options => {
  const n = parseBatchSize(options);
  return /** @type {any} */ (asWebStream(scBatch(n), {writableObjectMode: true, readableObjectMode: true, ...options}));
};

export default batch;
export * from '../core/utils/batch.js';
