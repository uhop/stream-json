'use strict';

const startObject = Ctr =>
  function() {
    if (this.current) {
      this.stack.push(this.current, this.key);
    }
    this.current = new Ctr();
    this.key = null;
  };

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

  //stringValue() - aliased below to _saveValue()

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

  //startObject() - assigned below

  endObject() {
    if (this.stack.length) {
      var value = this.current;
      this.key = this.stack.pop();
      this.current = this.stack.pop();
      this._saveValue(value);
    }
  }

  //startArray() - assigned below
  //endArray - aliased below to endObject

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

Assembler.prototype.stringValue = Assembler.prototype._saveValue;
Assembler.prototype.startObject = startObject(Object);
Assembler.prototype.startArray = startObject(Array);
Assembler.prototype.endArray = Assembler.prototype.endObject;

module.exports = Assembler;
