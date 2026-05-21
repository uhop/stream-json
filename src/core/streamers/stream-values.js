// @ts-self-types="./stream-values.d.ts"

import {none} from 'stream-chain/core';

import streamBase from './stream-base.js';
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

export default streamValues;
export {streamValues};
