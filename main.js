'use strict';

const Parser = require('./Parser');

const make = options => {
  if (!options || !('packKeys' in options || 'packStrings' in options || 'packNumbers' in options)) {
    options = options ? Object.create(options) : {};
    options.packKeys = options.packStrings = options.packNumbers = true;
  }
  const parser = new Parser(options);
  parser.on('data', item => parser.emit(item.name, item.value));
  return parser;
};

module.exports = make;
