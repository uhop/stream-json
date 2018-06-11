'use strict';

const Parser = require('./Parser');
const emit = require('./utils/emit');

const make = options => {
  if (!options || !('packKeys' in options || 'packStrings' in options || 'packNumbers' in options)) {
    options = Object.assign({}, options, {packKeys: true, packStrings: true, packNumbers: true});
  }
  return emit(new Parser(options));
};
make.Parser = Parser;

module.exports = make;
