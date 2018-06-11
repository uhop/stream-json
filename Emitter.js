'use strict';

const {Writable} = require('stream');

class Emitter extends Writable {
  constructor(options) {
    super(Object.assign({}, options, {objectMode: true}));
  }

  _write(chunk, encoding, callback) {
    this.emit(chunk.name, chunk.value);
    callback(null);
  }
}

module.exports = Emitter;
