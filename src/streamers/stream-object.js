// @ts-self-types="./stream-object.d.ts"

'use strict';

const {none} = require('stream-chain');

const streamBase = require('./stream-base');
const withParser = require('../utils/with-parser');

const streamObject = options => {
  let key = null;
  return streamBase({
    level: 1,

    first(chunk) {
      if (chunk.name !== 'startObject') throw new Error('Top-level object should be an object.');
    },

    push(asm, discard) {
      if (key === null) {
        key = asm.key;
      } else {
        let result = discard ? null : {key, value: asm.current[key]};
        asm.current = {};
        key = null;
        if (!discard) return result;
      }
      return none;
    }
  })(options);
};

module.exports = streamObject;
module.exports.streamObject = streamObject;

module.exports.withParser = options => withParser(streamObject, options);
module.exports.withParserAsStream = options => withParser.asStream(streamObject, options);
