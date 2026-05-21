// @ts-self-types="./replace.d.ts"

import {asStream, none, isMany, getManyValues, combineManyMut, many} from 'stream-chain';

import {filterBase, makeStackDiffer} from './filter-base.js';
import withParser from '../utils/with-parser.js';

const defaultReplacement = () => none;

const replace = options => {
  let replacementValue = options?.replacement;
  /** @type {any} */
  let replacement = defaultReplacement;
  switch (typeof replacementValue) {
    case 'function':
      replacement = replacementValue;
      break;
    case 'object':
      if (Array.isArray(replacementValue)) replacementValue = many(replacementValue);
      if (replacementValue) replacement = () => replacementValue;
      break;
  }
  const stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction: 'reject',
    defaultAction: 'accept-token',
    transition(stack, chunk, action, options) {
      if (action !== 'reject' && action !== 'reject-value') return stackDiffer(stack, chunk, options);
      let replacementTokens = replacement(stack, chunk, options);
      if (Array.isArray(replacementTokens)) replacementTokens = many(replacementTokens);
      if (replacementTokens === none || (isMany(replacementTokens) && !getManyValues(replacementTokens).length)) return none;
      return combineManyMut(stackDiffer(stack, null, options), replacementTokens);
    }
  })(options);
};

replace.replace = replace;
replace.asStream = options => asStream(replace(options), {writableObjectMode: true, readableObjectMode: true, ...options});
replace.withParser = options => withParser(replace, {packKeys: true, ...options});
replace.withParserAsStream = options => withParser.asStream(replace, {packKeys: true, ...options});

const asStream_ = replace.asStream;
const withParser_ = replace.withParser;
const withParserAsStream = replace.withParserAsStream;

export default replace;
export {replace, asStream_ as asStream, withParser_ as withParser, withParserAsStream};
