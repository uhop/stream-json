// @ts-self-types="./with-parser.d.ts"

'use strict';

const {asStream: makeStream, gen} = require('stream-chain');

const parser = require('../parser.js');

const withParser = (fn, options) => gen(parser(options), fn(options));

const asStream = (fn, options) => makeStream(withParser(fn, options), Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));

module.exports = withParser;
module.exports.asStream = asStream;
