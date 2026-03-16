// @ts-self-types="./batch.d.ts"

'use strict';

const {asStream} = require('stream-chain');
const scBatch = require('stream-chain/utils/batch.js');

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
  const stream = asStream(scBatch(n), Object.assign({writableObjectMode: true, readableObjectMode: true}, options));
  stream._batchSize = n;
  return stream;
};
batch.batch = batch.asStream;
module.exports = batch;
