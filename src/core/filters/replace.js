// @ts-self-types="./replace.d.ts"

import {many, none, combineManyMut, getManyValues, isMany} from 'stream-chain/core';

import {filterBase, makeStackDiffer} from './filter-base.js';
import {disassembler} from '../disassembler.js';

// an object with one of these names is a token; anything else is a plain value to disassemble
const tokenNames = {
  startObject: 1,
  endObject: 1,
  startArray: 1,
  endArray: 1,
  startKey: 1,
  endKey: 1,
  startString: 1,
  endString: 1,
  startNumber: 1,
  endNumber: 1,
  stringChunk: 1,
  numberChunk: 1,
  keyValue: 1,
  stringValue: 1,
  numberValue: 1,
  nullValue: 1,
  trueValue: 1,
  falseValue: 1,
  whitespace: 1,
  comma: 1,
  startComment: 1,
  commentChunk: 1,
  endComment: 1,
  commentValue: 1
};
const isToken = value => value !== null && typeof value == 'object' && tokenNames[value.name] === 1;

const defaultReplacement = () => none;

const replace = options => {
  const toTokens = disassembler(options); // shaped by the same packing/streaming options as the parser
  const normalize = value => {
    if (value === none) return none;
    if (value !== null && typeof value == 'object') {
      if (isMany(value)) return value;
      if (Array.isArray(value)) {
        if (value.every(isToken)) return many(value);
      } else if (tokenNames[value.name] === 1) {
        return value;
      }
    }
    return many([...toTokens(value)]);
  };
  let replacementValue = options?.replacement;
  /** @type {any} */
  let replacement = defaultReplacement;
  if (typeof replacementValue == 'function') {
    replacement = (stack, chunk, options) => normalize(replacementValue(stack, chunk, options));
  } else if (replacementValue !== undefined) {
    replacementValue = normalize(replacementValue);
    replacement = () => replacementValue;
  }
  const stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction: 'reject',
    defaultAction: 'accept-token',
    transition(stack, chunk, action, options) {
      if (action !== 'reject' && action !== 'reject-value') return stackDiffer(stack, chunk, options);
      let replacementTokens = replacement(stack, chunk, options);
      if (replacementTokens === none || (isMany(replacementTokens) && !getManyValues(replacementTokens).length)) return none;
      return combineManyMut(stackDiffer(stack, null, options), replacementTokens);
    }
  })(options);
};

replace.replace = replace;

export default replace;
export {replace};
