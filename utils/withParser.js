'use strict';

const Chain = require('stream-chain');

const Parser = require('../Parser');

const withParser = (fn, options) =>
  new Chain([new Parser(options), fn(options)], Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));

module.exports = withParser;
