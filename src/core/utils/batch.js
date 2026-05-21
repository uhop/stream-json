// @ts-self-types="./batch.d.ts"

import scBatch from 'stream-chain/utils/batch.js';

const parseBatchSize = options => {
  let n = 1000;
  if (options && typeof options.batchSize == 'number' && options.batchSize > 0) {
    n = Math.trunc(options.batchSize) || 1;
  }
  return n;
};

const batch = options => scBatch(parseBatchSize(options));

batch.batch = batch;
batch.parseBatchSize = parseBatchSize;

export default batch;
export {batch, parseBatchSize};
