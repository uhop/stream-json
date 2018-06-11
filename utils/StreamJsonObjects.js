'use strict';

const {Transform} = require('stream');

const Assembler = require('./Assembler');
const Combo = require('../Combo');

class StreamJsonObjects extends Transform {
  static streamJsonObjects(options) {
    return new StreamJsonObjects(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._assembler = null;
    this._counter = this._depth = 0;
  }

  _transform(chunk, encoding, callback) {
    if (!this._assembler) {
      this._assembler = new Assembler();
    }

    if (this._assembler[chunk.name]) {
      this._assembler[chunk.name](chunk.value);

      switch (chunk.name) {
        case 'startObject':
        case 'startArray':
          ++this._depth;
          break;
        case 'endObject':
        case 'endArray':
          --this._depth;
          break;
      }

      if (!this._depth) {
        this.push({index: this._counter++, value: this._assembler.current});
        this._assembler.current = this._assembler.key = null;
      }
    }

    callback(null);
  }

  static make(options) {
    const o = options ? Object.create(options) : {};
    o.packKeys = o.packStrings = o.packNumbers = o.jsonStreaming = true;

    const streams = [new Combo(o), new StreamJsonObjects(options)];

    // connect pipes
    const input = streams[0];
    let output = input;
    streams.forEach((stream, index) => index && (output = output.pipe(stream)));

    return {streams, input, output};
  }
}

module.exports = StreamJsonObjects;
