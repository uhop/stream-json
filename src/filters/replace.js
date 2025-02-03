// @ts-self-types="./replace.d.ts"

'use strict';

const {none, isMany, getManyValues, combineManyMut, many} = require('stream-chain');

const {filterBase, makeStackDiffer} = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

const defaultReplacement = () => none;

const replace = options => {
  let replacementValue = options?.replacement,
    replacement = defaultReplacement;
  switch (typeof replacementValue) {
    case 'function':
      replacement = replacementValue;
      break;
    case 'object':
      if (Array.isArray(replacementValue)) replacementValue = many(replacementValue);
      replacement = () => replacementValue;
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

module.exports = replace;
module.exports.replace = replace;

module.exports.withParser = options => withParser(replace, Object.assign({packKeys: true}, options));
module.exports.withParserAsStream = options => withParser.asStream(replace, Object.assign({packKeys: true}, options));
