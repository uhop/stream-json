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
      case 'startKey':
        if (this._allowEmptyReplacement) {
          this._transform = this._skipKeyChunks;
          return true;
        }
        break;
      case 'keyValue':
        if (this._allowEmptyReplacement) return true;
        break;
      case 'startObject':
        if (this._filter(this._stack, chunk)) {
          let replacement = this._replacement(this._stack, chunk);
          if (this._allowEmptyReplacement) {
            const key = this._stack[this._stack.length - 1];
            if (typeof key == 'string') {
              this.push({name: 'startKey'});
              this.push({name: 'stringChunk', value: key});
              this.push({name: 'endKey'});
              this.push({name: 'keyValue', value: key});
            }
            if (!replacement.length) replacement = FilterBase.defaultReplacement;
          }
          replacement.forEach(value => this.push(value));
          this._transform = this._skipObject;
          this._depth = 1;
          return true;
        }
        break;
      case 'startArray':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk).forEach(value => this.push(value));
          this._transform = this._skipObject;
          this._depth = 1;
          return true;
        }
        break;
      case 'startString':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk).forEach(value => this.push(value));
          this._transform = this._skipString;
          return true;
        }
        break;
      case 'startNumber':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk).forEach(value => this.push(value));
          this._transform = this._skipNumber;
          return true;
        }
        break;
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
        if (this._filter(this._stack, chunk)) {
          this._replacement(this._stack, chunk).forEach(value => this.push(value));
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
