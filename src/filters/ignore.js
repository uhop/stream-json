// @ts-self-types="./ignore.d.ts"

'use strict';

const {asStream, none} = require('stream-chain');

const {filterBase, makeStackDiffer} = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

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

module.exports = ignore;
module.exports.ignore = ignore;

module.exports.asStream = options => asStream(ignore(options), {writableObjectMode: true, readableObjectMode: true, ...options});

module.exports.withParser = options => withParser(ignore, {packKeys: true, ...options});
module.exports.withParserAsStream = options => withParser.asStream(ignore, {packKeys: true, ...options});
