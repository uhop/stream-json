// @ts-self-types="./pick.d.ts"

'use strict';

const {asStream} = require('stream-chain');

const filterBase = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

const pick = filterBase();

module.exports = pick;
module.exports.pick = pick;

module.exports.asStream = options => asStream(pick(options), {writableObjectMode: true, readableObjectMode: true, ...options});

module.exports.withParser = options => withParser(pick, {packKeys: true, ...options});
module.exports.withParserAsStream = options => withParser.asStream(pick, {packKeys: true, ...options});
