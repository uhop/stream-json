// @ts-self-types="./ignore.d.ts"

'use strict';

const {none} = require('stream-chain');

const {filterBase, makeStackDiffer} = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

const defaultEmptyArrayItem = {name: 'nullValue', value: null};

const ignore = options => {
  const stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction: 'reject',
    defaultAction: 'accept-token',
    transition(stack, chunk, action, options) {
      if (action === 'reject') return none;
      return stackDiffer(stack, chunk, options);
    }
  })(options);
};

module.exports = ignore;
module.exports.ignore = ignore;

module.exports.withParser = options => withParser(ignore, Object.assign({packKeys: true}, options));
module.exports.withParserAsStream = options => withParser.asStream(ignore, Object.assign({packKeys: true}, options));
