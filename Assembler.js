'use strict';

const EventEmitter = require('events');

const startObject = Ctr =>
  function() {
    if (this.done) {
      this.done = false;
    } else {
      this.stack.push(this.current, this.key);
    }
    this.current = new Ctr();
    this.key = null;
  };

class Assembler extends EventEmitter {
  static connectTo(stream) {
    return new Assembler().connectTo(stream);
  }

  constructor() {
    super();
    this.stack = [];
    this.current = this.key = null;
    this.done = true;
  }

  connectTo(stream) {
    stream.on('data', chunk => {
      if (this[chunk.name]) {
        this[chunk.name](chunk.value);
        if (this.done) this.emit('done', this);
      }
    });
    return this;
  }

  get depth() {
    return (this.stack.length >> 1) + (this.done ? 0 : 1);
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
        this.done = true;
      }
    }
    return this;
  }

  consume(chunk) {
    this[chunk.name] && this[chunk.name](chunk.value);
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
      const value = this.current;
      this.key = this.stack.pop();
      this.current = this.stack.pop();
      this._saveValue(value);
    } else {
      this.done = true;
    }
  }

  //startArray() - assigned below
  //endArray() - aliased below to endObject()

  _saveValue(value) {
    if (this.done) {
      this.current = value;
    } else {
      if (this.current instanceof Array) {
        this.current.push(value);
      } else {
        this.current[this.key] = value;
        this.key = null;
      }
    }
  }
}

Assembler.prototype.stringValue = Assembler.prototype._saveValue;
Assembler.prototype.startObject = startObject(Object);
Assembler.prototype.startArray = startObject(Array);
Assembler.prototype.endArray = Assembler.prototype.endObject;

module.exports = Assembler;
