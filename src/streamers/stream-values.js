// @ts-self-types="./stream-values.d.ts"

import {asStream, none} from 'stream-chain';

import streamBase from './stream-base.js';
import withParser from '../utils/with-parser.js';

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

streamValues.streamValues = streamValues;
streamValues.asStream = options => asStream(streamValues(options), {writableObjectMode: true, readableObjectMode: true, ...options});
streamValues.withParser = options => withParser(streamValues, {...options, jsonStreaming: true});
streamValues.withParserAsStream = options => withParser.asStream(streamValues, {...options, jsonStreaming: true});

const asStream_ = streamValues.asStream;
const withParser_ = streamValues.withParser;
const withParserAsStream = streamValues.withParserAsStream;

export default streamValues;
export {streamValues, asStream_ as asStream, withParser_ as withParser, withParserAsStream};
