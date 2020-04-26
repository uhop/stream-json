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
      if (typeof options.replacer == 'function') {
        this._replacer = options.replacer;
      } else if (Array.isArray(options.replacer)) {
        this._replacerDict = options.replacer.reduce((acc, k) => (acc[k] = 1, acc), {});
      }
    }
    !this._packKeys && (this._streamKeys = true);
    !this._packStrings && (this._streamStrings = true);
    !this._packNumbers && (this._streamNumbers = true);
  }

  _transform(chunk, _, callback) {
    const stack = [],
      isArray = [];
    if (chunk && typeof chunk == 'object' && typeof chunk.toJSON == 'function') {
      chunk = chunk.toJSON('');
    }
    if (this._replacer) {
      chunk = this._replacer('', chunk);
    }
    stack.push(chunk);
    while (stack.length) {
      const top = stack.pop();
      main: switch (typeof top) {
        case 'object':
          if (top instanceof Emit) {
            switch (top.tokenName) {
              case 'keyValue':
                const key = stack.pop();
                if (this._streamKeys) {
                  this.push({name: 'startKey'});
                  this.push({name: 'stringChunk', value: key});
                  this.push({name: 'endKey'});
                }
                this._packKeys && this.push({name: 'keyValue', value: key});
                break main;
              case 'startArray':
                isArray.push(true);
                break;
              case 'startObject':
                isArray.push(false);
                break;
              case 'endArray':
              case 'endObject':
                isArray.pop();
                break;
            }
            this.push({name: top.tokenName});
            break;
          }
          if (Array.isArray(top)) {
            stack.push(new Emit('endArray'));
            for (let i = top.length - 1; i >= 0; --i) {
              let value = top[i];
              if (value && typeof value == 'object' && typeof value.toJSON == 'function') {
                value = value.toJSON('' + i);
              }
              if (this._replacer) {
                value = this._replacer('' + i, value);
              }
              switch (typeof value) {
                case 'function':
                case 'symbol':
                case 'undefined':
                  value = null;
                  break;
              }
              stack.push(value);
            }
            stack.push(new Emit('startArray'));
            break;
          }
          if (top === null) {
            this.push({name: 'nullValue', value: null});
            break;
          }
          // all other objects are just objects
          const keys = Object.keys(top);
          stack.push(new Emit('endObject'));
          for (let i = keys.length - 1; i >= 0; --i) {
            const key = keys[i];
            if (this._replacerDict && this._replacerDict[key] !== 1) continue;
            let value = top[key];
            if (value && typeof value == 'object' && typeof value.toJSON == 'function') {
              value = value.toJSON(key);
            }
            if (this._replacer) {
              value = this._replacer(key, value);
            }
            switch (typeof value) {
              case 'function':
              case 'symbol':
              case 'undefined':
                continue;
            }
            stack.push(value, key, new Emit('keyValue'));
          }
          stack.push(new Emit('startObject'));
          break;
        case 'string':
          if (this._streamStrings) {
            this.push({name: 'startString'});
            this.push({name: 'stringChunk', value: top});
            this.push({name: 'endString'});
          }
          this._packStrings && this.push({name: 'stringValue', value: top});
          break;
        case 'number':
          const number = top.toString();
          if (isNaN(number) || !isFinite(number)) {
            this.push({name: 'nullValue', value: null});
            break;
          }
          if (this._streamNumbers) {
            this.push({name: 'startNumber'});
            this.push({name: 'numberChunk', value: number});
            this.push({name: 'endNumber'});
          }
          this._packNumbers && this.push({name: 'numberValue', value: number});
          break;
        case 'function':
        case 'symbol':
        case 'undefined':
          if (isArray.length && isArray[isArray.length - 1]) {
            // replace with null inside arrays
            this.push({name: 'nullValue', value: null});
          }
          break;
        case 'boolean':
          this.push(top ? {name: 'trueValue', value: true} : {name: 'falseValue', value: false});
          break;
        default:
          // skip everything else
          break;
      }
    }
    callback(null);
  }
}
Disassembler.disassembler = Disassembler.make;
Disassembler.make.Constructor = Disassembler;

module.exports = Disassembler;
