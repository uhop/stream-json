'use strict';

const {Transform} = require('stream');

class JsonlParser extends Transform {
  static make(options) {
    return new JsonlParser(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));
    this._buffer = '';
    this._counter = 0;
    this._reviver = options && options.reviver;
  }

  _transform(chunk, _, callback) {
    const lines = chunk.toString().split('\n');
    this._buffer += lines[0];
    if (lines.length > 1) {
      this._buffer && this.push({key: this._counter++, value: JSON.parse(this._buffer, this._reviver)});
      this._buffer = lines.pop();
      for (let i = 1; i < lines.length; ++i) {
        lines[i] && this.push({key: this._counter++, value: JSON.parse(lines[i], this._reviver)});
      }
    }
    callback(null);
  }

  _flush(callback) {
    if (this._buffer) {
      this.push({key: this._counter++, value: JSON.parse(this._buffer, this._reviver)});
      this._buffer = '';
    }
    callback(null);
  }
}
JsonlParser.parser = JsonlParser.make;
JsonlParser.make.Constructor = JsonlParser;

module.exports = JsonlParser;
