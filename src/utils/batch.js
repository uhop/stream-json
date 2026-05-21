// @ts-self-types="./batch.d.ts"

import {asStream} from 'stream-chain';
import scBatch from 'stream-chain/utils/batch.js';

const parseBatchSize = options => {
  let n = 1000;
  if (options && typeof options.batchSize == 'number' && options.batchSize > 0) {
    n = Math.trunc(options.batchSize) || 1;
  }
  return n;
};

const batch = options => scBatch(parseBatchSize(options));

batch.asStream = options => {
  const n = parseBatchSize(options);
  const stream = /** @type {any} */ (asStream(scBatch(n), {writableObjectMode: true, readableObjectMode: true, ...options}));
  stream._batchSize = n;
  return stream;
};
batch.batch = batch;

export default batch;
export {batch};
