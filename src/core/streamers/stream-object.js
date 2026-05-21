// @ts-self-types="./stream-object.d.ts"

import {none} from 'stream-chain/core';

import streamBase from './stream-base.js';
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

export default streamObject;
export {streamObject};
