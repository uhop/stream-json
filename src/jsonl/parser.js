// @ts-self-types="./parser.d.ts"

'use strict';

const {gen, none, asStream} = require('stream-chain');
const fixUtf8Stream = require('stream-chain/utils/fixUtf8Stream.js');
const lines = require('stream-chain/utils/lines.js');

const checkedParse = (input, reviver, errorIndicator) => {
  try {
    return JSON.parse(input, reviver);
  } catch (error) {
    if (typeof errorIndicator == 'function') return errorIndicator(error, input, reviver);
  }
  return errorIndicator;
};

const jsonlParser = options => {
  const reviver = options && options.reviver;
  const hasErrorIndicator = options && 'errorIndicator' in options;
  const errorIndicator = options && options.errorIndicator;
  let counter = 0;

  let parseLine;
  if (hasErrorIndicator) {
    parseLine = string => {
      if (!string) return none;
      const value = checkedParse(string, reviver, errorIndicator);
      return value === undefined ? none : {key: counter++, value};
    };
  } else {
    parseLine = string => {
      if (!string) return none;
      return {key: counter++, value: JSON.parse(string, reviver)};
    };
  }

  return gen(fixUtf8Stream(), lines(), parseLine);
};

jsonlParser.asStream = options =>
  asStream(jsonlParser(options), Object.assign({writableObjectMode: false, readableObjectMode: true}, options));
jsonlParser.make = jsonlParser.asStream;
jsonlParser.parser = jsonlParser.asStream;
jsonlParser.checkedParse = checkedParse;
jsonlParser.jsonlParser = jsonlParser;

module.exports = jsonlParser;
