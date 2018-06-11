'use strict';

const startObject = Ctr =>
  function() {
    if (this.current) {
      this.stack.push(this.current, this.key);
    }
    this.current = new Ctr();
    this.key = null;
  };

function endObject() {
  if (this.stack.length) {
    var value = this.current;
    this.key = this.stack.pop();
    this.current = this.stack.pop();
    this._saveValue(value);
  }
}

class Assembler {
  static connect(parser) {
    return new Assembler().connect(parser);
  }

  constructor() {
    this.stack = [];
    this.current = this.key = null;
  }

  connect(parser) {
    parser.on('data', chunk => this[chunk.name] && this[chunk.name](chunk.value));
    return this;
  }

  keyValue(value) {
    this.key = value;
  }

  //stringValue: stringValue, // aliased below as _saveValue

  numberValue(value) {
    this._saveValue(parseFloat(value));
  }
  nullValue() {
    this._saveValue(null);
  }
  trueValue() {
    this._saveValue(true);
  }
  falseValue() {
    this._saveValue(false);
  }

  _saveValue(value) {
    if (this.current) {
      if (this.current instanceof Array) {
        this.current.push(value);
      } else {
        this.current[this.key] = value;
        this.key = null;
      }
    } else {
      this.current = value;
    }
  }
}

Assembler.prototype.startArray = startObject(Array);
Assembler.prototype.endArray = endObject;

Assembler.prototype.startObject = startObject(Object);
Assembler.prototype.endObject = endObject;

Assembler.prototype.stringValue = Assembler.prototype._saveValue;

module.exports = Assembler;
