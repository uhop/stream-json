'use strict';

const {Transform} = require('stream');

const Assembler = require('./Assembler');
const Parser = require('../Parser');

const defaultObjectFilter = () => true;

class StreamFilteredArray extends Transform {
  static streamFilteredArray(options) {
    return new StreamFilteredArray(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));

    this.objectFilter = options && options.objectFilter;
    if (typeof this.objectFilter != 'function') {
      this.objectFilter = defaultObjectFilter;
    }

    this._processChunk = this._doCheck;
    this._subObjectCounter = 0;

    this._assembler = null;
    this._counter = 0;
  }

  _transform(chunk, encoding, callback) {
    if (this._assembler) {
      this._processChunk(chunk);
    } else {
      // first chunk should open an array
      if (chunk.name !== 'startArray') {
        return callback(new Error('Top-level object should be an array.'));
      }
      this._assembler = new Assembler();
      this._assembler[chunk.name] && this._assembler[chunk.name](chunk.value);
    }
    callback(null);
  }

  _doCheck(chunk) {
    if (!this._assembler[chunk.name]) {
      return;
    }

    this._assembler[chunk.name](chunk.value);

    if (!this._assembler.stack.length) {
      if (this._assembler.current.length) {
        this.push({index: this._counter++, value: this._assembler.current.pop()});
      }
      return;
    }

    if (this._assembler.key === null && this._assembler.stack.length) {
      const result = this.objectFilter(this._assembler);
      if (result) {
        this._processChunk = this._skipCheck;
      } else if (result === false) {
        this._processChunk = this._skipObject;
      }
    }
  }

  _skipCheck(chunk) {
    if (!this._assembler[chunk.name]) {
      return;
    }

    this._assembler[chunk.name](chunk.value);

    if (!this._assembler.stack.length && this._assembler.current.length) {
      this.push({index: this._counter++, value: this._assembler.current.pop()});
      this._processChunk = this._doCheck;
    }
  }

  _skipObject(chunk) {
    switch (chunk.name) {
      case 'startArray':
      case 'startObject':
        ++this._subObjectCounter;
        return;
      case 'endArray':
      case 'endObject':
        break;
      default:
        return;
    }
    if (this._subObjectCounter) {
      --this._subObjectCounter;
      return;
    }

    this._assembler[chunk.name] && this._assembler[chunk.name](chunk.value);

    if (!this._assembler.stack.length && this._assembler.current.length) {
      ++this._counter;
      this._assembler.current.pop();
      this._processChunk = this._doCheck;
    }
  }

  static withParser(options) {
    const o = options ? Object.create(options) : {};
    o.packKeys = o.packStrings = o.packNumbers = true;

    const streams = [new Parser(o), new StreamFilteredArray(options)];

    // connect pipes
    const input = streams[0];
    let output = input;
    streams.forEach((stream, index) => index && (output = output.pipe(stream)));

    return {streams, input, output};
  }
}
StreamFilteredArray.make = StreamFilteredArray.streamFilteredArray;

module.exports = StreamFilteredArray;
