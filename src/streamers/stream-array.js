// @ts-self-types="./stream-array.d.ts"

'use strict';

const {none} = require('stream-chain');

const streamBase = require('./stream-base.js');
const withParser = require('../utils/with-parser.js');

const streamArray = options => {
  let key = 0;
  return streamBase({
    level: 1,

    first(chunk) {
      if (chunk.name !== 'startArray') throw new Error('Top-level object should be an array.');
    },

    push(asm, discard) {
      if (asm.current.length) {
        if (discard) {
          ++key;
          asm.current.pop();
        } else {
          return {key: key++, value: asm.current.pop()};
        }
      }
      return none;
    }
  })(options);
};

module.exports = streamArray;
module.exports.streamArray = streamArray;

module.exports.withParser = options => withParser(streamArray, options);
module.exports.withParserAsStream = options => withParser.asStream(streamArray, options);
