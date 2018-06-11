'use strict';

const {Transform} = require('stream');

const Assembler = require('./Assembler');
const Combo = require('../Combo');

class StreamObject extends Transform {
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

    this._assembler[chunk.name] && this._assembler[chunk.name](chunk.value);

    if (!this._assembler.stack.length) {
      if (this._assembler.key === null) {
        if (this._lastKey !== null) {
          this.push({key: this._lastKey, value: this._assembler.current[this._lastKey]});
          delete this._assembler.current[this._lastKey];
          this._lastKey = null;
        }
      } else {
        this._lastKey = this._assembler.key;
      }
    }

    callback(null);
  }

  static make(options) {
    const o = options ? Object.create(options) : {};
    o.packKeys = o.packStrings = o.packNumbers = true;

    const streams = [new Combo(o), new StreamObject(options)];

    // connect pipes
    const input = streams[0];
    let output = input;
    streams.forEach((stream, index) => index && (output = output.pipe(stream)));

    return {streams, input, output};
  }
}

module.exports = StreamObject;
