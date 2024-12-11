// @ts-self-types="./filter.d.ts"

'use strict';

const {many} = require('stream-chain');

const filterBase = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

const filter = filterBase({
  checkAlways: true,
  transition(previousStack, stack, chunk, options) {
    const returnTokens = [];

    // find the common part
    let commonLength = 0;
    for (const n = Math.min(stack.length, previousStack.length); commonLength < n && stack[commonLength] === previousStack[commonLength]; ++commonLength);

    // close old objects
    for (let i = previousStack.length - 1; i > commonLength; --i) {
      returnTokens.push({name: typeof previousStack[i] == 'number' ? 'endArray' : 'endObject'});
    }
    if (commonLength < previousStack.length) {
      if (commonLength < stack.length) {
        if (typeof stack[commonLength] == 'string') {
          const key = stack[commonLength];
          if (options?.streamKeys) {
            returnTokens.push({name: 'startKey'}, {name: 'stringChunk', value: key}, {name: 'endKey'}, {name: 'keyValue', value: key});
          } else {
            returnTokens.push({name: 'keyValue', value: key});
          }
        }
        ++commonLength;
      } else {
        returnTokens.push({name: typeof previousStack[commonLength] == 'number' ? 'endArray' : 'endObject'});
      }
    }

    // open new objects
    for (let i = commonLength; i < stack.length; ++i) {
      const key = stack[i];
      if (typeof key == 'number') {
        if (key >= 0) returnTokens.push({name: 'startArray'});
      } else if (typeof key == 'string') {
        if (options?.streamKeys) {
          returnTokens.push({name: 'startObject'}, {name: 'startKey'}, {name: 'stringChunk', value: key}, {name: 'endKey'}, {name: 'keyValue', value: key});
        } else {
          returnTokens.push({name: 'startObject'}, {name: 'keyValue', value: key});
        }
      }
    }

    // add chunk
    if (chunk) returnTokens.push(chunk);

    return many(returnTokens);
  }
});

module.exports = filter;
module.exports.filter = filter;

module.exports.withParser = options => withParser(filter, options);
module.exports.withParserAsStream = options => withParser.asStream(filter, options);
