// @ts-self-types="./parser.d.ts"

import {gen, none} from 'stream-chain/core';

import fixUtf8Stream from 'stream-chain/utils/fixUtf8Stream.js';
import lines from 'stream-chain/utils/lines.js';

const checkedParse = (input, reviver, errorIndicator) => {
  try {
    return JSON.parse(input, reviver);
  } catch (error) {
    if (typeof errorIndicator == 'function') return errorIndicator(error, input, reviver);
  }
  return errorIndicator;
};

const jsonlParser = options => {
  const reviver = options?.reviver;
  const hasErrorIndicator = !!options && 'errorIndicator' in options;
  const errorIndicator = options?.errorIndicator;
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

jsonlParser.parser = jsonlParser;
jsonlParser.checkedParse = checkedParse;
jsonlParser.jsonlParser = jsonlParser;

export default jsonlParser;
export {jsonlParser, jsonlParser as parser, checkedParse};
