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

// The raw per-line parser (no fixUtf8Stream, no line splitting) — parallels the
// JSON parser's `jsonParser`. `parser` below wraps it with the input front
// (`fixUtf8Stream()` for cross-chunk UTF-8 + `lines()` for line splitting).
const jsonlParser = options => {
  const reviver = options?.reviver;
  const hasErrorIndicator = !!options && 'errorIndicator' in options;
  const errorIndicator = options?.errorIndicator;
  let counter = 0;

  if (hasErrorIndicator) {
    return string => {
      if (!string) return none;
      const value = checkedParse(string, reviver, errorIndicator);
      return value === undefined ? none : {key: counter++, value};
    };
  }
  return string => {
    if (!string) return none;
    return {key: counter++, value: JSON.parse(string, reviver)};
  };
};

const parser = options => gen(fixUtf8Stream(), lines(), jsonlParser(options));

parser.parser = parser;
parser.checkedParse = checkedParse;

export default parser;
export {parser, jsonlParser, checkedParse};
