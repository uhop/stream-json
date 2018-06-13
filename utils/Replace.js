'use strict';

const {Transform} = require('stream');
const withParser = require('./withParser');

const stringFilter = (string, separator) => stack => {
  const path = stack.join(separator);
  return (
    (path.length === string.length && path === string) ||
    (path.length > string.length && path.substr(0, string.length) === string && path.substr(string.length, separator.length) === separator)
  );
};

const regExpFilter = (regExp, separator) => stack => regExp.test(stack.join(separator));

const defaultReplacement = [{name: 'nullValue', value: null}];

const arrayReplacement = array => (stack, chunk, stream) => {
  array.forEach(value => stream.push(value));
};

class Replace extends Transform {
  static make(options) {
    return new Replace(options);
  }

  static withParser(options) {
    return withParser(Replace.make, options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._transform = this._check;
    this._once = options && options.once;
    this._stack = [];

    const replacement = options && options.replacement;
    if (typeof replacement == 'function') {
      this.replacement = replacement;
    } else {
      this.replacement = arrayReplacement(replacement || defaultReplacement);
    }

    const filter = options && options.filter,
      separator = (options && options.pathSeparator) || '.';
    if (typeof filter == 'string') {
      this.filter = stringFilter(filter, separator);
    } else if (typeof filter == 'function') {
      this.filter = filter;
    } else if (filter instanceof RegExp) {
      this.filter = regExpFilter(filter, separator);
    } else {
      this.filter = () => true;
    }
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
    // check, if we remove a value
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
        if (this.filter(this._stack, chunk)) {
          this.replacement(this._stack, chunk, this);
          this._transform = this._skipObject;
          this._depth = 1;
          return callback(null);
        }
        break;
      case 'startString':
        if (this.filter(this._stack, chunk)) {
          this.replacement(this._stack, chunk, this);
          this._transform = this._skipString;
          return callback(null);
        }
        break;
      case 'startNumber':
        if (this.filter(this._stack, chunk)) {
          this.replacement(this._stack, chunk, this);
          this._transform = this._skipNumber;
          return callback(null);
        }
        break;
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
        if (this.filter(this._stack, chunk)) {
          this.replacement(this._stack, chunk, this);
          this._transform = this._once ? this._pass : this._check;
          return callback(null);
        }
        break;
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

  _pass(chunk, encoding, callback) {
    this.push(chunk);
    callback(null);
  }
}
Replace.replace = Replace.make;
Replace.make.Constructor = Replace;

module.exports = Replace;
