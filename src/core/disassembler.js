// @ts-self-types="./disassembler.d.ts"

function* dump(value, options, processed) {
  if (!processed) {
    const holder = options.replacer ? {'': value} : null;
    if (typeof value?.toJSON == 'function') {
      value = value.toJSON('');
    }
    if (options.replacer) {
      value = options.replacer.call(holder, '', value);
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
        return;
      }
    // falls through
    case 'bigint':
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
    const length = value.length;
    for (let i = 0; i < length; ++i) {
      let v = value[i];
      if (typeof v?.toJSON == 'function') {
        v = v.toJSON(String(i));
      }
      if (options.replacer) {
        v = options.replacer.call(value, String(i), v);
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
  for (const k of options.keys || Object.keys(value)) {
    let v = value[k];
    if (typeof v?.toJSON == 'function') {
      v = v.toJSON(k);
    }
    if (options.replacer) {
      v = options.replacer.call(value, k, v);
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

// JSON.stringify's PropertyList: names, numbers, and their wrappers as strings, in order, once each
const propertyList = replacer => {
  const keys = new Set();
  for (const item of replacer) {
    if (typeof item == 'string' || typeof item == 'number' || item instanceof String || item instanceof Number) keys.add(String(item));
  }
  return [...keys];
};

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
      opt.keys = propertyList(options.replacer);
    }
  }

  !opt.packKeys && (opt.streamKeys = true);
  !opt.packStrings && (opt.streamStrings = true);
  !opt.packNumbers && (opt.streamNumbers = true);

  return value => dump(value, opt);
};

disassembler.disassembler = disassembler;

export default disassembler;
export {disassembler};
