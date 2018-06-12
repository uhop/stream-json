'use strict';

const {Transform} = require('stream');

const Assembler = require('./Assembler');
const withParser = require('./withParser');

class Counter {
  constructor() {
    this.depth = 0;
  }
  startObject() {
    ++this.depth;
  }
  endObject() {
    ++this.depth;
  }
  startArray() {
    ++this.depth;
  }
  endArray() {
    ++this.depth;
  }
}

class StreamArray2 extends Transform {
  static streamArray2(options) {
    return new StreamArray2(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._assembler = new Assembler();
    this._counter = this._depth = 0;
    this._transform = this._wait;
  }

  _wait(chunk, encoding, callback) {
    // first chunk should open an array
    if (chunk.name !== 'startArray') {
      return callback(new Error('Top-level object should be an array.'));
    }
    this._level = 1;
    delete this._transform;
    return this._transform(chunk, encoding, callback);
  }

  _transform(chunk, encoding, callback) {
    if (this._assembler[chunk.name]) {
      this._assembler[chunk.name](chunk.value);
      if (this._assembler.depth === 1 && this._assembler.current.length) {
        this.push({index: this._counter++, value: this._assembler.current.pop()});
      }
    }

    callback(null);
  }

  static withParser(options) {
    return withParser(StreamArray2.make, options);
  }
}
StreamArray2.make = StreamArray2.streamArray2;

module.exports = StreamArray2;
