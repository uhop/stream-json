// @ts-self-types="./filter.d.ts"

'use strict';

const {filterBase, makeStackDiffer} = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

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

module.exports = filter;
module.exports.filter = filter;

module.exports.withParser = options => withParser(filter, Object.assign({packKeys: true}, options));
module.exports.withParserAsStream = options => withParser.asStream(filter, Object.assign({packKeys: true}, options));
