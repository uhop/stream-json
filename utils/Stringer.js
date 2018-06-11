'use strict';

const {Transform} = require('stream');

const noCommaAfter = {startObject: 1, startArray: 1, endKey: 1},
  depthIncrement = {startObject: 1, startArray: 1},
  depthDecrement = {endObject: 1, endArray: 1},
  values = {keyValue: 1, stringValue: 1, numberValue: 1},
  symbols = {
    startObject: '{',
    endObject: '}',
    startArray: '[',
    endArray: ']',
    startKey: '"',
    endKey: '":',
    startString: '"',
    endString: '"',
    startNumber: '',
    endNumber: '',
    nullValue: 'null',
    trueValue: 'true',
    falseValue: 'false'
  };

class Stringer extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: false}));
    this._prev = '';
    this._depth = 0;
  }

  _transform(chunk, encoding, callback) {
    if (values[chunk.name] !== 1) {
      // filter out values
      switch (chunk.name) {
        case 'endObject':
        case 'endArray':
        case 'endKey':
        case 'endString':
        case 'endNumber':
          this.push(symbols[chunk.name]);
          break;
        case 'stringChunk':
          this.push(chunk.value.replace(/\"/g, '\\"'));
          break;
        case 'numberChunk':
          this.push(chunk.value);
          break;
        default:
          // case 'startObject': case 'startArray': case 'startKey': case 'startString':
          // case 'startNumber': case 'nullValue': case 'truelValue': case 'falseValue':
          if (this._depth && noCommaAfter[this._prev] !== 1) this.push(',');
          this.push(symbols[chunk.name]);
          break;
      }
      if (depthIncrement[chunk.name]) {
        ++this._depth;
      } else if (depthDecrement[chunk.name]) {
        --this._depth;
      }
      this._prev = chunk.name;
    }
    callback(null);
  }
}

module.exports = Stringer;
