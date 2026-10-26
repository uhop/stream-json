// @ts-self-types="./filter.d.ts"

import {filterBase, makeStackDiffer} from './filter-base.js';
const filter = options => {
  const specialAction = options?.acceptObjects ? 'accept' : 'accept-token',
    stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction,
    transition(stack, chunk, action, options) {
      // an accepted object/array passes through whole, its end token included: do not track it as open
      return stackDiffer(stack, action === 'accept' ? null : chunk, options);
    }
  })(options);
};

filter.filter = filter;

export default filter;
export {filter};
