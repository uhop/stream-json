'use strict';

const startObject = Ctr =>
  function() {
    if (this.hasObject) {
      this.stack.push(this.current, this.key);
    } else {
      this.hasObject = 1;
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
    this.hasObject = 0;
  }

  connect(parser) {
    parser.on('data', chunk => this[chunk.name] && this[chunk.name](chunk.value));
    return this;
  }

  get depth() {
    return this.hasObject + (this.stack.length >> 1);
  }

  get done() {
    return !this.hasObject;
  }

  get path() {
    const path = [];
    for (let i = 0; i < this.stack.length; i += 2) {
      const key = this.stack[i + 1];
      path.push(key === null ? this.stack[i].length : key);
    }
    return path;
  }

  dropToLevel(level) {
    if (level < this.depth) {
      if (level) {
        const index = (level - 1) << 1;
        this.current = this.stack[index];
        this.key = this.stack[index + 1];
        this.stack.splice(index);
      } else {
        this.stack = [];
        this.current = this.key = null;
        this.hasObject = 0;
      }
    }
  }

  consume(chunk) {
    this[chunk.name] && this[chunk.name](chunk.value);
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
      const value = this.current;
      this.key = this.stack.pop();
      this.current = this.stack.pop();
      this._saveValue(value);
    } else {
      this.hasObject = 0;
    }
  }

  //startArray() - assigned below
  //endArray - aliased below to endObject

  _saveValue(value) {
    if (this.hasObject) {
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
