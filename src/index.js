// @ts-self-types="./index.d.ts"

'use strict';

const parser = require('./parser.js');
const emit = require('./utils/emit.js');

const make = options => emit(parser.asStream(options));

module.exports = make;
module.exports.parser = parser;
