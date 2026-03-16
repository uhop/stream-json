// @ts-self-types="./stringer.d.ts"

'use strict';

const {Transform} = require('node:stream');

class JsonlStringer extends Transform {
  static make(options) {
    return new JsonlStringer(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: false}));
    this._replacer = options && options.replacer;
    this._separator = options && typeof options.separator == 'string' ? options.separator : '\n';
  }

  _transform(chunk, _, callback) {
    this.push(JSON.stringify(chunk, this._replacer));
    this._transform = this._nextTransform;
    callback(null);
  }

  _nextTransform(chunk, _, callback) {
    this.push(this._separator + JSON.stringify(chunk, this._replacer));
    callback(null);
  }
}
JsonlStringer.stringer = JsonlStringer.make;
JsonlStringer.make.Constructor = JsonlStringer;

module.exports = JsonlStringer;
