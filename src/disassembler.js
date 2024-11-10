// @ts-self-types="./disassembler.d.ts"

'use strict';

const {asStream: makeStream} = require('stream-chain');

function* dump(value, options, processed) {
  if (!processed) {
    if (typeof value?.toJSON == 'function') {
      value = value.toJSON('');
    }
    if (options.replacer) {
      value = options.replacer('', value);
    }
  }

  switch (typeof value) {
    case 'function':
    case 'symbol':
    case 'undefined':
      return;
    case 'number':
      if (isNaN(value) || !isFinite(value)) {
        yield {name: 'nullValue', value: null};
      }
      value = String(value);
      if (options.streamNumbers) {
        yield {name: 'startNumber'};
        yield {name: 'numberChunk', value};
        yield {name: 'endNumber'};
      }
      if (options.packNumbers) {
        yield {name: 'numberValue', value};
      }
      return;
    case 'string':
      if (options.streamStrings) {
        yield {name: 'startString'};
        yield {name: 'stringChunk', value};
        yield {name: 'endString'};
      }
      if (options.packStrings) {
        yield {name: 'stringValue', value};
      }
      return;
    case 'boolean':
      yield value ? {name: 'trueValue', value: true} : {name: 'falseValue', value: false};
      return;
    case 'object':
      break;
    default:
      return; // skip anything else
  }

  // null
  if (value === null) {
    yield {name: 'nullValue', value: null};
    return;
  }

  // Array
  if (Array.isArray(value)) {
    yield {name: 'startArray'};
    for (let i = 0; i < value.length; ++i) {
      let v = value[i];
      if (typeof v?.toJSON == 'function') {
        v = v.toJSON(String(i));
      }
      if (options.replacer) {
        v = options.replacer(String(i), v);
      }
      switch (typeof v) {
        case 'function':
        case 'symbol':
        case 'undefined':
          v = null; // force null
          break;
      }
      yield* dump(v, options, true);
    }
    yield {name: 'endArray'};
    return;
  }

  // Object
  yield {name: 'startObject'};
  for (let [k, v] of Object.entries(value)) {
    if (options.dict && options.dict[k] !== 1) continue;
    if (typeof v?.toJSON == 'function') {
      v = v.toJSON(k);
    }
    if (options.replacer) {
      v = options.replacer(k, v);
    }
    switch (typeof v) {
      case 'function':
      case 'symbol':
      case 'undefined':
        continue;
    }
    if (options.streamKeys) {
      yield {name: 'startKey'};
      yield {name: 'stringChunk', value: k};
      yield {name: 'endKey'};
    }
    if (options.packKeys) {
      yield {name: 'keyValue', value: k};
    }
    yield* dump(v, options, true);
  }
  yield {name: 'endObject'};
}

const disassembler = options => {
  const opt = {packKeys: true, packStrings: true, packNumbers: true, streamKeys: true, streamStrings: true, streamNumbers: true};

  if (options) {
    'packValues' in options && (opt.packKeys = opt.packStrings = opt.packNumbers = options.packValues);
    'packKeys' in options && (opt.packKeys = options.packKeys);
    'packStrings' in options && (opt.packStrings = options.packStrings);
    'packNumbers' in options && (opt.packNumbers = options.packNumbers);

    'streamValues' in options && (opt.streamKeys = opt.streamStrings = opt.streamNumbers = options.streamValues);
    'streamKeys' in options && (opt.streamKeys = options.streamKeys);
    'streamStrings' in options && (opt.streamStrings = options.streamStrings);
    'streamNumbers' in options && (opt.streamNumbers = options.streamNumbers);

    if (typeof options.replacer == 'function') {
      opt.replacer = options.replacer;
    } else if (Array.isArray(options.replacer)) {
      opt.dict = options.replacer.reduce((acc, k) => ((acc[k] = 1), acc), {});
    }
  }

  !opt.packKeys && (opt.streamKeys = true);
  !opt.packStrings && (opt.streamStrings = true);
  !opt.packNumbers && (opt.streamNumbers = true);

  return value => dump(value, opt);
};

const asStream = options => makeStream(disassembler(options), Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));

module.exports = disassembler;
module.exports.disassembler = disassembler;
module.exports.asStream = asStream;
