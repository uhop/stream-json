'use strict';

const Chain = require('stream-chain');

const Parser = require('../Parser');

const withParser = (fn, options) => {
  let opt = options;
  if (!options || !('packValues' in options || 'packKeys' in options || 'packStrings' in options || 'packNumbers' in options)) {
    opt = Object.assign({}, options, {packValues: true});
  }
  return new Chain([new Parser(opt), fn(options)], Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));
};

module.exports = withParser;
