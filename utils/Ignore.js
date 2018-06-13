'use strict';

const FilterBase = require('./FilterBase');
const withParser = require('./withParser');

class Ignore extends FilterBase {
  static make(options) {
    return new Ignore(options);
  }

  static withParser(options) {
    return withParser(Ignore.make, options);
  }

  _checkChunk(chunk, encoding, callback) {
    switch (chunk.name) {
      case 'startKey':
        this._transform = this._skipKeyChunks;
        return true;
      case 'keyValue':
        return true;
      case 'startObject':
      case 'startArray':
        if (this._filter(this._stack, chunk)) {
          this._transform = this._skipObject;
          this._depth = 1;
          return true;
        }
        break;
      case 'startString':
        if (this._filter(this._stack, chunk)) {
          this._transform = this._skipString;
          return true;
        }
        break;
      case 'startNumber':
        if (this._filter(this._stack, chunk)) {
          this._transform = this._skipNumber;
          return true;
        }
        break;
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
        if (this._filter(this._stack, chunk)) {
          this._transform = this._once ? this._pass : this._check;
          return true;
        }
        break;
    }
    // issue a key, if needed
    const key = this._stack[this._stack.length - 1];
    if (typeof key == 'string') {
      switch (chunk.name) {
        case 'startObject':
        case 'startArray':
        case 'startString':
        case 'startNumber':
        case 'nullValue':
        case 'trueValue':
        case 'falseValue':
          this.push({name: 'startKey'});
          this.push({name: 'stringChunk', value: key});
          this.push({name: 'endKey'});
          this.push({name: 'keyValue', value: key});
          break;
      }
    }
    this.push(chunk);
    return false;
  }
}
Ignore.ignore = Ignore.make;
Ignore.make.Constructor = Ignore;

module.exports = Ignore;
