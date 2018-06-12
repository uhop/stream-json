'use strict';

const {Transform} = require('stream');

const Assembler = require('./Assembler');
const withParser = require('./withParser');

class StreamObject extends Transform {
  static streamObject(options) {
    return new StreamObject(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._assembler = null;
    this._lastKey = null;
  }

  _transform(chunk, encoding, callback) {
    if (!this._assembler) {
      // first chunk should open an object
      if (chunk.name !== 'startObject') {
        return callback(new Error('Top-level construct should be an object.'));
      }
      this._assembler = new Assembler();
    }

    if (this._assembler[chunk.name]) {
      this._assembler[chunk.name](chunk.value);
      if (this._assembler.depth === 1) {
        if (this._lastKey === null) {
          this._lastKey = this._assembler.key;
        } else {
          this.push({key: this._lastKey, value: this._assembler.current[this._lastKey]});
          this._assembler.current = {};
          this._lastKey = null;
        }
      }
    }

    callback(null);
  }

  static withParser(options) {
    return withParser(StreamObject.make, options);
  }
}
StreamObject.make = StreamObject.streamObject;

module.exports = StreamObject;
