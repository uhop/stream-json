// @ts-self-types="./filter-base.d.ts"

'use strict';

const {none, flushable} = require('stream-chain');

const checkableTokens = {
    startObject: 1,
    startArray: 1,
    startString: 1,
    startNumber: 1,
    nullValue: 1,
    trueValue: 1,
    falseValue: 1,
    stringValue: 1,
    numberValue: 1
  },
  stopTokens = {
    startObject: 'endObject',
    startArray: 'endArray',
    startString: 'endString',
    startNumber: 'endNumber'
  },
  optionalTokens = {endString: 'stringValue', endNumber: 'numberValue'};

const defaultTransition = (_previousStack, _stack, chunk) => chunk,
  defaultFilter = () => true;

const stringFilter = (string, separator) => {
  const stringWithSeparator = string + separator;
  return stack => {
    const path = stack.join(separator);
    return path === string || path.startsWith(stringWithSeparator);
  };
};

const regExpFilter = (regExp, separator) => {
  return stack => regExp.test(stack.join(separator));
};

const filterBase =
  ({transition = defaultTransition, checkAlways} = {}) =>
  options => {
    const once = options?.once,
      separator = options?.pathSeparator || '.';
    let filter = defaultFilter;
    if (options) {
      if (typeof options.filter == 'function') {
        filter = options.filter;
      } else if (typeof options.filter == 'string') {
        filter = stringFilter(options.filter, separator);
      } else if (options.filter instanceof RegExp) {
        filter = regExpFilter(options.filter, separator);
      }
    }
    let state = 'check',
      stack = [],
      previousStack = [],
      previousToken = '',
      endToken = '',
      optionalToken = '';
    return flushable(chunk => {
      if (chunk === none) {
        const returnToken = transition(previousStack, []);
        previousStack = [];
        return returnToken || none;
      }
      if (optionalToken) {
        if (optionalToken === chunk.name) {
          optionalToken = '';
          return chunk;
        }
        optionalToken = '';
      }
      if (state === 'pass') return none;
      switch (chunk.name) {
        case 'startObject':
        case 'startArray':
        case 'startString':
        case 'startNumber':
        case 'nullValue':
        case 'trueValue':
        case 'falseValue':
          if (typeof stack[stack.length - 1] == 'number') {
            // array
            ++stack[stack.length - 1];
          }
          break;
        case 'keyValue':
          stack[stack.length - 1] = chunk.value;
          break;
        case 'numberValue':
          if (previousToken !== 'endNumber' && typeof stack[stack.length - 1] == 'number') {
            // array
            ++stack[stack.length - 1];
          }
          break;
        case 'stringValue':
          if (previousToken !== 'endString' && typeof stack[stack.length - 1] == 'number') {
            // array
            ++stack[stack.length - 1];
          }
          break;
      }
      previousToken = chunk.name;
      let returnToken = none;
      if (state === 'check' && checkableTokens[chunk.name] === 1 && filter(stack, chunk)) {
        endToken = stopTokens[chunk.name] || '';
        if (endToken) {
          returnToken = transition(previousStack, stack, chunk, options);
          previousStack = stack.slice();
          if (!checkAlways) state = 'accepting';
        } else {
          returnToken = chunk;
        }
      }
      switch (chunk.name) {
        case 'startObject':
          stack.push(null);
          break;
        case 'startArray':
          stack.push(-1);
          break;
        case 'endObject':
        case 'endArray':
          stack.pop();
          break;
      }
      switch (state) {
        case 'accepting':
          state = 'accept';
          break;
        case 'accept':
          if (chunk.name === endToken) {
            if (stack.length === previousStack.length) {
              state = once ? 'pass' : 'check';
              optionalToken = optionalTokens[endToken] || '';
              endToken = '';
            }
          }
          returnToken = chunk;
      }
      return returnToken;
    });
  };

module.exports = filterBase;
module.exports.filterBase = filterBase;
