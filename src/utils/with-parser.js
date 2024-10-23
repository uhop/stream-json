// @ts-self-types="./with-parser.d.ts"

'use strict';

const {chain} = require('stream-chain');

const Parser = require('../parser');

const withParser = (fn, options) =>
  chain([new Parser(options), fn(options)], Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));

module.exports = withParser;
