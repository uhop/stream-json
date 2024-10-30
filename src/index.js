// @ts-self-types="./index.d.ts"

'use strict';

const parser = require('./parser');
const emit = require('./utils/emit');

const make = options => emit(parser.asStream(options));
make.parser = parser;

module.exports = make;
