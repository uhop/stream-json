// @ts-self-types="./batch.d.ts"

import {asWebStream} from 'stream-chain/web';
import scBatch from 'stream-chain/utils/batch.js';

import batch, {parseBatchSize} from '../../core/utils/batch.js';

/** @type {any} */ (batch).asWebStream = options => {
  const n = parseBatchSize(options);
  const pair = /** @type {any} */ (asWebStream(scBatch(n), {writableObjectMode: true, readableObjectMode: true, ...options}));
  pair._batchSize = n;
  return pair;
};

export default batch;
export * from '../../core/utils/batch.js';
