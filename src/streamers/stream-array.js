// @ts-self-types="./stream-array.d.ts"

import {asStream, none} from 'stream-chain';

import streamBase from './stream-base.js';
import withParser from '../utils/with-parser.js';

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

streamArray.streamArray = streamArray;
streamArray.asStream = options => asStream(streamArray(options), {writableObjectMode: true, readableObjectMode: true, ...options});
streamArray.withParser = options => withParser(streamArray, options);
streamArray.withParserAsStream = options => withParser.asStream(streamArray, options);

const asStream_ = streamArray.asStream;
const withParser_ = streamArray.withParser;
const withParserAsStream = streamArray.withParserAsStream;

export default streamArray;
export {streamArray, asStream_ as asStream, withParser_ as withParser, withParserAsStream};
