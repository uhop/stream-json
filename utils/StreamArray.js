'use strict';

const {Transform} = require('stream');

const Assembler = require('./Assembler');
const withParser = require('./withParser');

class StreamArray extends Transform {
  static streamArray(options) {
    return new StreamArray(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._assembler = null;
    this._counter = 0;
  }

  _transform(chunk, encoding, callback) {
    if (!this._assembler) {
      // first chunk should open an array
      if (chunk.name !== 'startArray') {
        return callback(new Error('Top-level object should be an array.'));
      }
      this._assembler = new Assembler();
    }

    this._assembler[chunk.name] && this._assembler[chunk.name](chunk.value);

    if (!this._assembler.stack.length && this._assembler.current.length) {
      this.push({index: this._counter++, value: this._assembler.current.pop()});
    }

    callback(null);
  }

  static withParser(options) {
    return withParser(StreamArray.make, options);
  }
}
StreamArray.make = StreamArray.streamArray;

module.exports = StreamArray;
