'use strict';

const {Transform} = require('stream');

class Emit {
  constructor(tokenName) {
    this.tokenName = tokenName;
  }
}

class Disassembler extends Transform {
  static make(options) {
    return new Disassembler(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._packKeys = this._packStrings = this._packNumbers = this._streamKeys = this._streamStrings = this._streamNumbers = true;
    if (options) {
      'packValues' in options && (this._packKeys = this._packStrings = this._packNumbers = options.packValues);
      'packKeys' in options && (this._packKeys = options.packKeys);
      'packStrings' in options && (this._packStrings = options.packStrings);
      'packNumbers' in options && (this._packNumbers = options.packNumbers);
      'streamValues' in options && (this._streamKeys = this._streamStrings = this._streamNumbers = options.streamValues);
      'streamKeys' in options && (this._streamKeys = options.streamKeys);
      'streamStrings' in options && (this._streamStrings = options.streamStrings);
      'streamNumbers' in options && (this._streamNumbers = options.streamNumbers);
      this._jsonStreaming = options.jsonStreaming;
    }
    !this._packKeys && (this._streamKeys = true);
    !this._packStrings && (this._streamStrings = true);
    !this._packNumbers && (this._streamNumbers = true);
  }

  _transform(chunk, encoding, callback) {
    const stack = [chunk];
    while (stack.length) {
      const top = stack.pop();
      if (top && typeof top == 'object') {
        if (top instanceof Emit) {
          if (top.tokenName === 'keyValue') {
            const key = stack.pop();
            if (this._streamKeys) {
              this.push({name: 'startKey'});
              this.push({name: 'stringChunk', value: key});
              this.push({name: 'endKey'});
            }
            this._packKeys && this.push({name: 'keyValue', value: key});
          } else {
            this.push({name: top.tokenName});
          }
          continue;
        } else if (Array.isArray(top)) {
          stack.push(new Emit('endArray'));
          for (var i = top.length - 1; i >= 0; --i) {
            stack.push(top[i]);
          }
          stack.push(new Emit('startArray'));
        } else { // all other objects are just objects
          const keys = Object.keys(top);
          stack.push(new Emit('endObject'));
          for (var i = keys.length - 1; i >= 0; --i) {
            const key = keys[i];
            stack.push(top[key], key, new Emit('keyValue'));
          }
          stack.push(new Emit('startObject'));
        }
      } else {
        if (typeof top == 'string') {
          if (this._streamStrings) {
            this.push({name: 'startString'});
            this.push({name: 'stringChunk', value: top});
            this.push({name: 'endString'});
          }
          this._packStrings && this.push({name: 'stringValue', value: top});
        } else if (typeof top == 'number') {
          const number = top.toString();
          if (this._streamNumbers) {
            this.push({name: 'startNumber'});
            this.push({name: 'numberChunk', value: number});
            this.push({name: 'endNumber'});
          }
          this._packNumbers && this.push({name: 'numberValue', value: number});
        } else if (top === true) {
          this.push({name: 'trueValue', value: true});
        } else if (top === false) {
          this.push({name: 'falseValue', value: false});
        } else { // everything else is null
          this.push({name: 'nullValue', value: null});
        }
      }
    }
    callback(null);
  }
}
Disassembler.disassembler = Disassembler.make;
Disassembler.make.Constructor = Disassembler;

module.exports = Disassembler;
