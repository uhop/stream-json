// @ts-self-types="./filter.d.ts"

'use strict';

const {many, none} = require('stream-chain');

const filterBase = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

const filter = options => {
  const specialAction = options?.acceptObjects ? 'accept' : 'accept-token';
  let previousStack = [];
  return filterBase({
    specialAction,
    transition(stack, chunk, _action, options) {
      const returnTokens = [];

      // find the common part
      let commonLength = 0;
      for (const n = Math.min(stack.length, previousStack.length); commonLength < n && stack[commonLength] === previousStack[commonLength]; ++commonLength);

      // close old objects
      for (let i = previousStack.length - 1; i > commonLength; --i) {
        returnTokens.push({name: typeof previousStack[i] == 'number' ? 'endArray' : 'endObject'});
      }

      // update the index
      if (commonLength < previousStack.length) {
        if (commonLength < stack.length) {
          const key = stack[commonLength];
          if (typeof key == 'string') {
            if (options?.streamKeys) {
              returnTokens.push({name: 'startKey'}, {name: 'stringChunk', value: key}, {name: 'endKey'});
            }
            if (options?.packKeys || !options?.streamKeys) {
              returnTokens.push({name: 'keyValue', value: key});
            }
          } else if (typeof key == 'number' && options?.skippedArrayValue) {
            for (let i = Math.max(0, previousStack[commonLength] + 1); i < key; ++i) {
              returnTokens.push(...options.skippedArrayValue);
            }
          }
          previousStack[commonLength] = key;
          ++commonLength;
        } else {
          returnTokens.push({name: typeof previousStack[commonLength] == 'number' ? 'endArray' : 'endObject'});
        }
      }

      // remove old elements
      previousStack.splice(commonLength);

      // open new objects
      for (let i = commonLength; i < stack.length; ++i) {
        const key = stack[i];
        previousStack.push(key);
        if (typeof key == 'number') {
          if (key >= 0) {
            returnTokens.push({name: 'startArray'});
            if (options?.skippedArrayValue) {
              for (let j = 0; j < key; ++j) {
                returnTokens.push(...options.skippedArrayValue);
              }
            }
          }
        } else if (typeof key == 'string') {
          returnTokens.push({name: 'startObject'});
          if (options?.streamKeys) {
            returnTokens.push({name: 'startKey'}, {name: 'stringChunk', value: key}, {name: 'endKey'});
          }
          if (options?.packKeys || !options?.streamKeys) {
            returnTokens.push({name: 'keyValue', value: key});
          }
        }
      }

      // save the stack
      switch (chunk?.name) {
        case 'startObject':
          previousStack.push(null);
          break;
        case 'startArray':
          previousStack.push(-1);
          break;
      }

      return many(returnTokens);
    }
  })(options);
};

module.exports = filter;
module.exports.filter = filter;

module.exports.withParser = options => withParser(filter, Object.assign({packKeys: true}, options));
module.exports.withParserAsStream = options => withParser.asStream(filter, Object.assign({packKeys: true}, options));
