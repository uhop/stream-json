// @ts-self-types="./assembler.d.ts"

import {none} from 'stream-chain/core';

const startObject = Ctr =>
  /** @this {Assembler} */
  function () {
    if (this.done) {
      this.done = false;
    } else {
      this.stack.push(this.current, this.key);
    }
    this.current = new Ctr();
    this.key = null;
  };

class Assembler {
  static connectTo(stream, options) {
    return new Assembler(options).connectTo(stream);
  }

  constructor(options) {
    this.stack = [];
    this.current = this.key = null;
    this.done = true;
    this._onDone = null;
    if (options) {
      this.reviver = typeof options.reviver == 'function' && options.reviver;
      if (this.reviver) {
        this.stringValue = this._saveValue = this._saveValueWithReviver;
      }
      if (options.numberAsString) {
        this.numberValue = this.stringValue;
      }
      if (typeof options.onDone == 'function') {
        this._onDone = options.onDone;
      }
    }

    this.tapChain = chunk => {
      if (this[chunk.name]) {
        this[chunk.name](chunk.value);
        if (this.done) return this.current;
      }
      return none;
    };
  }

  connectTo(stream) {
    const consume = chunk => {
      if (this[chunk.name]) {
        this[chunk.name](chunk.value);
        if (this.done) this._onDone?.(this);
      }
    };
    if (typeof stream?.getReader === 'function') {
      const reader = stream.getReader();
      (async () => {
        try {
          for (;;) {
            const {done, value} = await reader.read();
            if (done) return;
            consume(value);
          }
        } finally {
          reader.releaseLock();
        }
      })();
    } else {
      stream.on('data', consume);
    }
    return this;
  }

  onDone(fn) {
    this._onDone = typeof fn == 'function' ? fn : null;
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
      if (level > 0) {
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
    this[chunk.name]?.(chunk.value);
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
      if (this.reviver) {
        this.current = this.reviver.call({'': this.current}, '', this.current);
      }
      this.done = true;
    }
  }

  //startArray() - assigned below
  //endArray() - aliased below to endObject()

  _saveValue(value) {
    if (this.done) {
      this.current = value;
      return;
    }
    if (this.current instanceof Array) {
      this.current.push(value);
    } else {
      this.current[this.key] = value;
      this.key = null;
    }
  }
  _saveValueWithReviver(value) {
    if (this.done) {
      this.current = this.reviver.call({'': value}, '', value);
      return;
    }
    if (this.current instanceof Array) {
      this.current.push(value);
      value = this.reviver.call(this.current, String(this.current.length - 1), value);
      if (value === undefined) {
        delete this.current[this.current.length - 1];
      } else {
        this.current[this.current.length - 1] = value;
      }
    } else {
      value = this.reviver.call(this.current, this.key, value);
      if (value !== undefined) {
        this.current[this.key] = value;
      }
      this.key = null;
    }
  }
}

// TS 7 checkJs: no expando-prototype inference
const proto = /** @type {any} */ (Assembler.prototype);
proto.stringValue = Assembler.prototype._saveValue;
proto.startObject = startObject(Object);
proto.startArray = startObject(Array);
proto.endArray = Assembler.prototype.endObject;

const assembler = options => new Assembler(options);
Assembler.assembler = assembler;

export default Assembler;
export {Assembler, assembler};
