// @ts-self-types="./filter.d.ts"

import {filterBase, makeStackDiffer} from './filter-base.js';
const filter = options => {
  const specialAction = options?.acceptObjects ? 'accept' : 'accept-token',
    stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction,
    transition(stack, chunk, _action, options) {
      return stackDiffer(stack, chunk, options);
    }
  })(options);
};

filter.filter = filter;

export default filter;
export {filter};
