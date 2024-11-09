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
        return none;
      }
      if (discard) {
        asm.current = {};
        key = null;
        return none;
      }
      const result = {key, value: asm.current[key]};
      asm.current = {};
      key = null;
      return result;
    }
  })(options);
};

module.exports = streamObject;
module.exports.streamObject = streamObject;

module.exports.withParser = options => withParser(streamObject, options);
module.exports.withParserAsStream = options => withParser.asStream(streamObject, options);
