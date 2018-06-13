'use strict';

const {Transform} = require('stream');

const stringFilter = (string, separator) => stack => {
  const path = stack.join(separator);
  return (
    (path.length === string.length && path === string) ||
    (path.length > string.length && path.substr(0, string.length) === string && path.substr(string.length, separator.length) === separator)
  );
};

const regExpFilter = (regExp, separator) => stack => regExp.test(stack.join(separator));

class FilterBase extends Transform {
  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._transform = this._check;
    this._stack = [];

    const filter = options && options.filter,
      separator = (options && options.pathSeparator) || '.';
    if (typeof filter == 'string') {
      this._filter = stringFilter(filter, separator);
    } else if (typeof filter == 'function') {
      this._filter = filter;
    } else if (filter instanceof RegExp) {
      this._filter = regExpFilter(filter, separator);
    // } else {
    //   this._filter = () => true;
    }
    this._once = options && options.once;
  }

  _check(chunk, encoding, callback) {
    // update the last stack key
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
      case 'startString':
      case 'startNumber':
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
        if (typeof this._stack[this._stack.length - 1] == 'number') {
          // array
          ++this._stack[this._stack.length - 1];
        }
        break;
      case 'keyValue':
        this._stack[this._stack.length - 1] = chunk.value;
        break;
    }
    // check, if we allow a chunk
    if (this._checkChunk(chunk, encoding)) {
      return callback(null);
    }
    // update the stack
    switch (chunk.name) {
      case 'startObject':
        this._stack.push(null);
        break;
      case 'startArray':
        this._stack.push(-1);
        break;
      case 'endObject':
      case 'endArray':
        this._stack.pop();
        break;
    }
    callback(null);
  }

  _passObject(chunk, encoding, callback) {
    this.push(chunk);
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
        ++this._depth;
        break;
      case 'endObject':
      case 'endArray':
        --this._depth;
        break;
    }
    if (!this._depth) {
      this._transform = this._once ? this._skip : this._check;
    }
    callback(null);
  }

  _passString(chunk, encoding, callback) {
    if (this._expected) {
      const expected = this._expected;
      this._expected = '';
      this._transform = this._once ? this._skip : this._check;
      if (expected === chunk.name) {
        this.push(chunk);
      } else {
        return this._transform(chunk, encoding, callback);
      }
    } else {
      this.push(chunk);
      if (chunk.name === 'endString') {
        this._expected = 'stringValue';
      }
    }
    callback(null);
  }

  _passNumber(chunk, encoding, callback) {
    if (this._expected) {
      const expected = this._expected;
      this._expected = '';
      this._transform = this._once ? this._skip : this._check;
      if (expected === chunk.name) {
        this.push(chunk);
      } else {
        return this._transform(chunk, encoding, callback);
      }
    } else {
      this.push(chunk);
      if (chunk.name === 'endNumber') {
        this._expected = 'numberValue';
      }
    }
    callback(null);
  }

  _pass(chunk, encoding, callback) {
    this.push(chunk);
    callback(null);
  }

  _skipObject(chunk, encoding, callback) {
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
        ++this._depth;
        break;
      case 'endObject':
      case 'endArray':
        --this._depth;
        break;
    }
    if (!this._depth) {
      this._transform = this._once ? this._pass : this._check;
    }
    callback(null);
  }

  _skipString(chunk, encoding, callback) {
    if (this._expected) {
      const expected = this._expected;
      this._expected = '';
      this._transform = this._once ? this._pass : this._check;
      if (expected !== chunk.name) {
        return this._transform(chunk, encoding, callback);
      }
    } else {
      if (chunk.name === 'endString') {
        this._expected = 'stringValue';
      }
    }
    callback(null);
  }

  _skipNumber(chunk, encoding, callback) {
    if (this._expected) {
      const expected = this._expected;
      this._expected = '';
      this._transform = this._once ? this._pass : this._check;
      if (expected !== chunk.name) {
        return this._transform(chunk, encoding, callback);
      }
    } else {
      if (chunk.name === 'endNumber') {
        this._expected = 'numberValue';
      }
    }
    callback(null);
  }

  _skipKeyChunks(chunk, encoding, callback) {
    if (chunk.name === 'endKey') {
      this._transform = this._check;
    }
    callback(null);
  }

  _skip(chunk, encoding, callback) {
    callback(null);
  }
}

module.exports = FilterBase;
