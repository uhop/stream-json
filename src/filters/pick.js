// @ts-self-types="./pick.d.ts"

'use strict';

const filterBase = require('./filter-base.js');
const withParser = require('../utils/with-parser.js');

const pick = filterBase();

module.exports = pick;
module.exports.pick = pick;

module.exports.withParser = options => withParser(pick, Object.assign({packKeys: true}, options));
module.exports.withParserAsStream = options => withParser.asStream(pick, Object.assign({packKeys: true}, options));
