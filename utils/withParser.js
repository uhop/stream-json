'use strict';

const Chain = require('stream-chain');

const Parser = require('../Parser');

const withParser = (fn, options) => {
  let opt = options;
  if (!options || !('packKeys' in options || 'packStrings' in options || 'packNumbers' in options)) {
    opt = Object.assign({}, options, {packKeys: true, packStrings: true, packNumbers: true});
  }
  return new Chain([new Parser(opt), fn(options)], Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));
};

module.exports = withParser;
