// @ts-self-types="./index.d.ts"

'use strict';

const Parser = require('./parser');
const emit = require('./utils/emit');

const make = options => emit(new Parser(options));

make.Parser = Parser;
make.parser = Parser.parser;

module.exports = make;
