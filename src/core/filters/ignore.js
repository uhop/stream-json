// @ts-self-types="./ignore.d.ts"

import {none} from 'stream-chain/core';

import {filterBase, makeStackDiffer} from './filter-base.js';
const ignore = options => {
  const stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction: 'reject',
    defaultAction: 'accept-token',
    transition(stack, chunk, action, options) {
      if (action === 'reject' || action === 'reject-value') return none;
      return stackDiffer(stack, chunk, options);
    }
  })(options);
};

ignore.ignore = ignore;

export default ignore;
export {ignore};
