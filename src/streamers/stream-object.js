// @ts-self-types="./stream-object.d.ts"

import {asStream, none} from 'stream-chain';

import streamBase from './stream-base.js';
import withParser from '../utils/with-parser.js';

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

streamObject.streamObject = streamObject;
streamObject.asStream = options => asStream(streamObject(options), {writableObjectMode: true, readableObjectMode: true, ...options});
streamObject.withParser = options => withParser(streamObject, options);
streamObject.withParserAsStream = options => withParser.asStream(streamObject, options);

const asStream_ = streamObject.asStream;
const withParser_ = streamObject.withParser;
const withParserAsStream = streamObject.withParserAsStream;

export default streamObject;
export {streamObject, asStream_ as asStream, withParser_ as withParser, withParserAsStream};
