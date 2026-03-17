// @ts-self-types="./flex-assembler.d.ts"

'use strict';

const EventEmitter = require('node:events');
const {none} = require('stream-chain');

const compileFilter = (filter, separator) => {
  if (typeof filter == 'function') return filter;
  if (typeof filter == 'string') {
    const filterWithSep = filter + separator;
    return path => {
      const joined = path.join(separator);
      return joined === filter || joined.startsWith(filterWithSep);
    };
  }
  if (filter instanceof RegExp) {
    return path => {
      filter.lastIndex = 0;
      return filter.test(path.join(separator));
    };
  }
  return () => true;
};

const compileRules = (rules, separator) => {
  if (!rules || !rules.length) return null;
  return rules.map(rule => ({...rule, filter: compileFilter(rule.filter, separator)}));
};

class FlexAssembler extends EventEmitter {
  static connectTo(stream, options) {
    return new FlexAssembler(options).connectTo(stream);
  }

  constructor(options) {
    super();
    this.objectStack = [];
    this.keyStack = [];
    this.current = this.key = null;
    this.rule = null;
    this.isArray = false;
    this.arrayIndex = -1;
    this.done = true;
    this.reviver = false;

    const separator = options?.pathSeparator || '.';
    this.objectRules = compileRules(options?.objectRules, separator);
    this.arrayRules = compileRules(options?.arrayRules, separator);

    if (options) {
      this.reviver = typeof options.reviver == 'function' && options.reviver;
      if (options.numberAsString) {
        this.numberValue = this.stringValue;
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
    stream.on('data', chunk => {
      if (this[chunk.name]) {
        this[chunk.name](chunk.value);
        if (this.done) this.emit('done', this);
      }
    });
    return this;
  }

  get depth() {
    return this.objectStack.length + (this.done ? 0 : 1);
  }

  get path() {
    return this.keyStack.slice();
  }

  dropToLevel(level) {
    if (level < this.depth) {
      if (level > 0) {
        const index = level - 1;
        const entry = this.objectStack[index];
        this.current = entry.container;
        this.rule = entry.rule;
        this.isArray = entry.isArray;
        this.arrayIndex = entry.arrayIndex;
        this.key = null;
        this.objectStack.length = index;
        this.keyStack.length = index;
      } else {
        this.objectStack.length = 0;
        this.keyStack.length = 0;
        this.current = this.key = null;
        this.rule = null;
        this.isArray = false;
        this.arrayIndex = -1;
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

  stringValue(value) {
    this._saveValue(value);
  }

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

  _matchRule(rules) {
    if (!rules) return null;
    for (const rule of rules) {
      if (rule.filter(this.keyStack)) return rule;
    }
    return null;
  }

  _pushState() {
    this.objectStack.push({container: this.current, rule: this.rule, isArray: this.isArray, arrayIndex: this.arrayIndex});
    if (this.isArray) {
      ++this.arrayIndex;
      this.keyStack.push(this.arrayIndex);
    } else {
      this.keyStack.push(this.key);
    }
  }

  startObject() {
    if (this.done) {
      this.done = false;
    } else {
      this._pushState();
    }
    this.rule = this._matchRule(this.objectRules);
    this.isArray = false;
    this.arrayIndex = -1;
    this.current = this.rule ? this.rule.create(this.keyStack) : {};
    this.key = null;
  }

  startArray() {
    if (this.done) {
      this.done = false;
    } else {
      this._pushState();
    }
    this.rule = this._matchRule(this.arrayRules);
    this.isArray = true;
    this.arrayIndex = -1;
    this.current = this.rule ? this.rule.create(this.keyStack) : [];
    this.key = null;
  }

  endObject() {
    if (this.rule && this.rule.finalize) {
      this.current = this.rule.finalize(this.current);
    }
    if (this.objectStack.length) {
      const value = this.current;
      const entry = this.objectStack.pop();
      this.key = this.keyStack.pop();
      this.current = entry.container;
      this.rule = entry.rule;
      this.isArray = entry.isArray;
      this.arrayIndex = entry.arrayIndex;
      this._addToCurrent(value);
    } else {
      if (this.reviver) {
        this.current = this.reviver.call({'': this.current}, '', this.current);
      }
      this.done = true;
    }
  }

  _saveValue(value) {
    if (this.done) {
      if (this.reviver) value = this.reviver.call({'': value}, '', value);
      this.current = value;
      return;
    }
    if (this.isArray) ++this.arrayIndex;
    this._addToCurrent(value);
  }

  _addToCurrent(value) {
    if (this.isArray) {
      if (this.reviver) {
        value = this.reviver.call(this.current, String(this.arrayIndex), value);
        if (value === undefined) return;
      }
      if (this.rule) {
        this.rule.add(this.current, value);
      } else {
        this.current.push(value);
      }
    } else {
      if (this.reviver) {
        value = this.reviver.call(this.current, this.key, value);
        if (value === undefined) {
          this.key = null;
          return;
        }
      }
      if (this.rule) {
        this.rule.add(this.current, this.key, value);
      } else {
        this.current[this.key] = value;
      }
      this.key = null;
    }
  }
}

FlexAssembler.prototype.endArray = FlexAssembler.prototype.endObject;

module.exports = FlexAssembler;
module.exports.flexAssembler = options => new FlexAssembler(options);
