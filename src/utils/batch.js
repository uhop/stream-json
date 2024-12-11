// @ts-self-types="./batch.d.ts"

'use strict';

const {Transform} = require('node:stream');
const withParser = require('./with-parser.js');

class Batch extends Transform {
  static make(options) {
    return new Batch(options);
  }

  static withParser(options) {
    return withParser(Batch.make, options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._batchSize = 1000;
    if (options && typeof options.batchSize == 'number' && options.batchSize > 0) {
      this._batchSize = options.batchSize;
    }
    this._accumulator = [];
  }

  _transform(chunk, _, callback) {
    this._accumulator.push(chunk);
    if (this._accumulator.length >= this._batchSize) {
      this.push(this._accumulator);
      this._accumulator = [];
    }
    callback(null);
  }

  _flush(callback) {
    if (this._accumulator.length) {
      this.push(this._accumulator);
      this._accumulator = null;
    }
    callback(null);
  }
}
Batch.batch = Batch.make;
Batch.make.Constructor = Batch;

module.exports = Batch;
