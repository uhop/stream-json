// @ts-self-types="./stream-array.d.ts"

import {none} from 'stream-chain/core';

import streamBase from './stream-base.js';
const streamArray = options => {
  let key = 0;
  return streamBase({
    level: 1,

    first(chunk) {
      if (chunk.name !== 'startArray') throw new Error('Top-level object should be an array.');
    },

    push(asm, discard) {
      const current = /** @type {unknown[]} */ (asm.current);
      if (current.length) {
        if (discard) {
          ++key;
          current.pop();
        } else {
          return {key: key++, value: current.pop()};
        }
      }
      return none;
    }
  })(options);
};

streamArray.streamArray = streamArray;

export default streamArray;
export {streamArray};
