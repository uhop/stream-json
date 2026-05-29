// @ts-self-types="./stringer.d.ts"

import {flushable, none} from 'stream-chain/core';

const noCommaAfter = {startObject: 1, startArray: 1, endKey: 1, keyValue: 1, comma: 1},
  noSpaceAfter = {endObject: 1, endArray: 1, '': 1},
  noSpaceBefore = {startObject: 1, startArray: 1},
  depthIncrement = {startObject: 1, startArray: 1},
  depthDecrement = {endObject: 1, endArray: 1},
  values = {startKey: 'keyValue', startString: 'stringValue', startNumber: 'numberValue'},
  stopNames = {startKey: 'endKey', startString: 'endString', startNumber: 'endNumber'},
  symbols = {
    startObject: '{',
    endObject: '}',
    startArray: '[',
    endArray: ']',
    startKey: '"',
    endKey: '":',
    startString: '"',
    endString: '"',
    startNumber: '',
    endNumber: '',
    nullValue: 'null',
    trueValue: 'true',
    falseValue: 'false'
  };

const replaceSymbols = {'\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t', '"': '\\"', '\\': '\\\\'};
const sanitizeString = value =>
  value.replace(/[\b\f\n\r\t\"\\\u0000-\u001F\u007F-\u009F]/g, match =>
    Object.hasOwn(replaceSymbols, match) ? replaceSymbols[match] : '\\u' + ('0000' + match.charCodeAt(0).toString(16)).slice(-4)
  );

const stringer = options => {
  const vals = {};
  let makeArray = false;
  let useCommas = false;
  if (options) {
    'useValues' in options && (vals.keyValue = vals.stringValue = vals.numberValue = options.useValues);
    'useKeyValues' in options && (vals.keyValue = options.useKeyValues);
    'useStringValues' in options && (vals.stringValue = options.useStringValues);
    'useNumberValues' in options && (vals.numberValue = options.useNumberValues);
    makeArray = options.makeArray;
    'useCommas' in options && (useCommas = options.useCommas);
  }

  let prev = '';
  let depth = 0;
  let skip = null;
  let first = !!makeArray;

  const processToken = chunk => {
    if (chunk.name === 'whitespace') return chunk.value;
    if (chunk.name === 'comment') return chunk.value;
    if (chunk.name === 'comma') {
      // With useCommas, render the streamed comma and mark prev='comma' so the
      // auto-insert below is suppressed for the next value/key (`comma` is in
      // noCommaAfter). If a comma token is missing — dropped by an upstream
      // transform — prev is the previous value instead, so auto-insert still
      // fires and the output stays valid (correct, if not byte-faithful).
      // Without useCommas, drop stray comma tokens; auto-insert handles separators.
      if (!useCommas) return none;
      prev = chunk.name;
      return ',';
    }

    if (skip) {
      if (chunk.name === skip) skip = null;
      return none;
    }

    let result = '';

    if (vals[chunk.name]) {
      if (depth && noCommaAfter[prev] !== 1) result += ',';
      switch (chunk.name) {
        case 'keyValue':
          result += '"' + sanitizeString(chunk.value) + '":';
          break;
        case 'stringValue':
          result += '"' + sanitizeString(chunk.value) + '"';
          break;
        case 'numberValue':
          result += chunk.value;
          break;
      }
    } else {
      switch (chunk.name) {
        case 'endObject':
        case 'endArray':
        case 'endKey':
        case 'endString':
        case 'endNumber':
          result += symbols[chunk.name];
          break;
        case 'stringChunk':
          result += sanitizeString(chunk.value);
          break;
        case 'numberChunk':
          result += chunk.value;
          break;
        case 'keyValue':
        case 'stringValue':
        case 'numberValue':
          break;
        case 'startKey':
        case 'startString':
        case 'startNumber':
          if (vals[values[chunk.name]]) {
            skip = stopNames[chunk.name];
            return none;
          }
        // intentional fall down
        default:
          if (depth) {
            if (noCommaAfter[prev] !== 1) result += ',';
          } else {
            if (noSpaceAfter[prev] !== 1 && noSpaceBefore[chunk.name] !== 1) result += ' ';
          }
          result += symbols[chunk.name];
          break;
      }
      if (depthIncrement[chunk.name]) {
        ++depth;
      } else if (depthDecrement[chunk.name]) {
        --depth;
      }
    }
    prev = chunk.name;
    return result || none;
  };

  return flushable(chunk => {
    if (chunk === none) {
      if (!makeArray) return none;
      if (first) return '[]';
      return processToken({name: 'endArray'});
    }
    if (first) {
      first = false;
      const prefix = processToken({name: 'startArray'});
      const main = processToken(chunk);
      return main === none ? prefix : prefix + main;
    }
    return processToken(chunk);
  });
};

stringer.stringer = stringer;

export default stringer;
export {stringer, stringer as jsoncStringer};
