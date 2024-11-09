// @ts-self-types="./stream-values.d.ts"

'use strict';

const {none} = require('stream-chain');

const streamBase = require('./stream-base');
const withParser = require('../utils/with-parser');

const streamValues = options => {
  let key = 0;
  return streamBase({
    level: 0,

    push(asm, discard) {
      if (discard) {
        ++key;
        return none;
      }
      const result = {key: key++, value: asm.current};
      asm.key = asm.current = null;
      return result;
    }
  })(options);
};

module.exports = streamValues;
module.exports.streamValues = streamValues;

module.exports.withParser = options => withParser(streamValues, Object.assign({}, options, {jsonStreaming: true}));
module.exports.withParserAsStream = options => withParser.asStream(streamValues, Object.assign({}, options, {jsonStreaming: true}));
