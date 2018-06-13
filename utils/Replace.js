'use strict';

const FilterBase = require('./FilterBase');
const withParser = require('./withParser');

class Replace extends FilterBase {
  static make(options) {
    return new Replace(options);
  }

  static withParser(options) {
    return withParser(Replace.make, options);
  }

  _checkChunk(chunk) {
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk, this);
          this._transform = this._skipObject;
          this._depth = 1;
          return true;
        }
        break;
      case 'startString':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk, this);
          this._transform = this._skipString;
          return true;
        }
        break;
      case 'startNumber':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk, this);
          this._transform = this._skipNumber;
          return true;
        }
        break;
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk, this);
          this._transform = this._once ? this._pass : this._check;
          return true;
        }
        break;
    }
    this.push(chunk);
    return false;
  }
}
Replace.replace = Replace.make;
Replace.make.Constructor = Replace;

module.exports = Replace;
