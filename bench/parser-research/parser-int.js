
import {flushable, gen, many, none} from 'stream-chain/core';
import fixUtf8Stream from 'stream-chain/utils/fixUtf8Stream.js';

const VALUE1 = 0,
  VALUE = 1,
  KEYVAL = 2,
  STRING = 3,
  KEY1 = 4,
  KEY = 5,
  COLON = 6,
  ARRAY_STOP = 7,
  OBJECT_STOP = 8,
  NUMBER_START = 9,
  NUMBER_DIGIT = 10,
  NUMBER_FRACTION = 11,
  NUMBER_FRAC_START = 12,
  NUMBER_FRAC_DIGIT = 13,
  NUMBER_EXPONENT = 14,
  NUMBER_EXP_SIGN = 15,
  NUMBER_EXP_START = 16,
  NUMBER_EXP_DIGIT = 17,
  DONE = 18;

const patterns = {
  value1: /[\"\{\[\]\-\d]|true\b|false\b|null\b|\s{1,256}/y,
  string: /[^\x00-\x1f\"\\]{1,256}|\\[bfnrt\"\\\/]|\\u[\da-fA-F]{4}|\"/y,
  key1: /[\"\}]|\s{1,256}/y,
  colon: /\:|\s{1,256}/y,
  comma: /[\,\]\}]|\s{1,256}/y,
  ws: /\s{1,256}/y,
  numberStart: /\d/y,
  numberDigit: /\d{0,256}/y,
  numberFraction: /[\.eE]/y,
  numberExponent: /[eE]/y,
  numberExpSign: /[-+]/y
};
const MAX_PATTERN_SIZE = 16;

patterns.numberFracStart = patterns.numberExpStart = patterns.numberStart;
patterns.numberFracDigit = patterns.numberExpDigit = patterns.numberDigit;

const expected = {object: OBJECT_STOP, array: ARRAY_STOP, '': DONE};

const tokenStartObject = {name: 'startObject'},
  tokenEndObject = {name: 'endObject'},
  tokenStartArray = {name: 'startArray'},
  tokenEndArray = {name: 'endArray'},
  tokenStartString = {name: 'startString'},
  tokenEndString = {name: 'endString'},
  tokenStartNumber = {name: 'startNumber'},
  tokenEndNumber = {name: 'endNumber'},
  tokenStartKey = {name: 'startKey'},
  tokenEndKey = {name: 'endKey'},
  literalTokens = {
    true: {name: 'trueValue', value: true},
    false: {name: 'falseValue', value: false},
    null: {name: 'nullValue', value: null}
  };

// long hexadecimal codes: \uXXXX
const fromHex = s => String.fromCharCode(parseInt(s.slice(2), 16));

// short codes: \b \f \n \r \t \" \\ \/
const codes = {b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\', '/': '/'};

const jsonParser = options => {
  let packKeys = true,
    packStrings = true,
    packNumbers = true,
    streamKeys = true,
    streamStrings = true,
    streamNumbers = true,
    jsonStreaming = false;

  if (options) {
    'packValues' in options && (packKeys = packStrings = packNumbers = options.packValues);
    'packKeys' in options && (packKeys = options.packKeys);
    'packStrings' in options && (packStrings = options.packStrings);
    'packNumbers' in options && (packNumbers = options.packNumbers);
    'streamValues' in options && (streamKeys = streamStrings = streamNumbers = options.streamValues);
    'streamKeys' in options && (streamKeys = options.streamKeys);
    'streamStrings' in options && (streamStrings = options.streamStrings);
    'streamNumbers' in options && (streamNumbers = options.streamNumbers);
    jsonStreaming = options.jsonStreaming;
  }

  !packKeys && (streamKeys = true);
  !packStrings && (streamStrings = true);
  !packNumbers && (streamNumbers = true);

  let done = false,
    expect = jsonStreaming ? DONE : VALUE,
    parent = '',
    openNumber = false,
    accumulator = '',
    buffer = '';

  const stack = [];

  return flushable(buf => {
    const tokens = [];

    if (buf === none) {
      done = true;
    } else {
      buffer += buf;
    }

    let match,
      value,
      index = 0;

    main: for (;;) {
      switch (expect) {
        case VALUE1:
        case VALUE:
          patterns.value1.lastIndex = index;
          match = patterns.value1.exec(buffer);
          if (!match) {
            if (done || index + MAX_PATTERN_SIZE < buffer.length) {
              if (index < buffer.length) throw new Error('Parser cannot parse input: expected a value');
              throw new Error('Parser has expected a value');
            }
            break main; // wait for more input
          }
          value = match[0];
          switch (value) {
            case '"':
              if (streamStrings) tokens.push(tokenStartString);
              expect = STRING;
              break;
            case '{':
              tokens.push(tokenStartObject);
              stack.push(parent);
              parent = 'object';
              expect = KEY1;
              break;
            case '[':
              tokens.push(tokenStartArray);
              stack.push(parent);
              parent = 'array';
              expect = VALUE1;
              break;
            case ']':
              if (expect !== VALUE1) throw new Error("Parser cannot parse input: unexpected token ']'");
              if (openNumber) {
                if (streamNumbers) tokens.push(tokenEndNumber);
                openNumber = false;
                if (packNumbers) {
                  tokens.push({name: 'numberValue', value: accumulator});
                  accumulator = '';
                }
              }
              tokens.push(tokenEndArray);
              parent = stack.pop();
              expect = expected[parent];
              break;
            case '-':
              openNumber = true;
              if (streamNumbers) {
                tokens.push(tokenStartNumber, {name: 'numberChunk', value: '-'});
              }
              packNumbers && (accumulator = '-');
              expect = NUMBER_START;
              break;
            case '0':
              openNumber = true;
              if (streamNumbers) {
                tokens.push(tokenStartNumber, {name: 'numberChunk', value: '0'});
              }
              packNumbers && (accumulator = '0');
              expect = NUMBER_FRACTION;
              break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
              openNumber = true;
              if (streamNumbers) {
                tokens.push(tokenStartNumber, {name: 'numberChunk', value});
              }
              packNumbers && (accumulator = value);
              expect = NUMBER_DIGIT;
              break;
            case 'true':
            case 'false':
            case 'null':
              if (buffer.length - index === value.length && !done) break main; // wait for more input
              tokens.push(literalTokens[value]);
              expect = expected[parent];
              break;
            // default: // ws
          }
          index += value.length;
          break;
        case KEYVAL:
        case STRING:
          patterns.string.lastIndex = index;
          match = patterns.string.exec(buffer);
          if (!match) {
            if (index < buffer.length && (done || buffer.length - index >= 6)) throw new Error('Parser cannot parse input: escaped characters');
            if (done) throw new Error('Parser has expected a string value');
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            if (expect === KEYVAL) {
              if (streamKeys) tokens.push(tokenEndKey);
              if (packKeys) {
                tokens.push({name: 'keyValue', value: accumulator});
                accumulator = '';
              }
              expect = COLON;
            } else {
              if (streamStrings) tokens.push(tokenEndString);
              if (packStrings) {
                tokens.push({name: 'stringValue', value: accumulator});
                accumulator = '';
              }
              expect = expected[parent];
            }
          } else if (value.length > 1 && value.charAt(0) === '\\') {
            const t = value.length == 2 ? codes[value.charAt(1)] : fromHex(value);
            if (expect === KEYVAL ? streamKeys : streamStrings) {
              tokens.push({name: 'stringChunk', value: t});
            }
            if (expect === KEYVAL ? packKeys : packStrings) {
              accumulator += t;
            }
          } else {
            if (expect === KEYVAL ? streamKeys : streamStrings) {
              tokens.push({name: 'stringChunk', value});
            }
            if (expect === KEYVAL ? packKeys : packStrings) {
              accumulator += value;
            }
          }
          index += value.length;
          break;
        case KEY1:
        case KEY:
          patterns.key1.lastIndex = index;
          match = patterns.key1.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected an object key');
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            if (streamKeys) tokens.push(tokenStartKey);
            expect = KEYVAL;
          } else if (value === '}') {
            if (expect !== KEY1) throw new Error("Parser cannot parse input: unexpected token '}'");
            tokens.push(tokenEndObject);
            parent = stack.pop();
            expect = expected[parent];
          }
          index += value.length;
          break;
        case COLON:
          patterns.colon.lastIndex = index;
          match = patterns.colon.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error("Parser cannot parse input: expected ':'");
            break main; // wait for more input
          }
          value = match[0];
          value === ':' && (expect = VALUE);
          index += value.length;
          break;
        case ARRAY_STOP:
        case OBJECT_STOP:
          patterns.comma.lastIndex = index;
          match = patterns.comma.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error("Parser cannot parse input: expected ','");
            break main; // wait for more input
          }
          if (openNumber) {
            if (streamNumbers) tokens.push(tokenEndNumber);
            openNumber = false;
            if (packNumbers) {
              tokens.push({name: 'numberValue', value: accumulator});
              accumulator = '';
            }
          }
          value = match[0];
          if (value === ',') {
            expect = expect === ARRAY_STOP ? VALUE : KEY;
          } else if (value === '}' || value === ']') {
            if (value === '}' ? expect === ARRAY_STOP : expect !== ARRAY_STOP) {
              throw new Error("Parser cannot parse input: expected '" + (expect === ARRAY_STOP ? ']' : '}') + "'");
            }
            tokens.push(value === '}' ? tokenEndObject : tokenEndArray);
            parent = stack.pop();
            expect = expected[parent];
          }
          index += value.length;
          break;
        // number chunks
        case NUMBER_START: // [0-9]
          patterns.numberStart.lastIndex = index;
          match = patterns.numberStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a starting digit');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = value === '0' ? NUMBER_FRACTION : NUMBER_DIGIT;
          index += value.length;
          break;
        case NUMBER_DIGIT: // [0-9]*
          patterns.numberDigit.lastIndex = index;
          match = patterns.numberDigit.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a digit');
            break main; // wait for more input
          }
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push({name: 'numberChunk', value});
            packNumbers && (accumulator += value);
            index += value.length;
          } else {
            if (index < buffer.length) {
              expect = NUMBER_FRACTION;
              break;
            }
            if (done) {
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case NUMBER_FRACTION: // [\.eE]?
          patterns.numberFraction.lastIndex = index;
          match = patterns.numberFraction.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) {
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = value === '.' ? NUMBER_FRAC_START : NUMBER_EXP_SIGN;
          index += value.length;
          break;
        case NUMBER_FRAC_START: // [0-9]
          patterns.numberFracStart.lastIndex = index;
          match = patterns.numberFracStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a fractional part of a number');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = NUMBER_FRAC_DIGIT;
          index += value.length;
          break;
        case NUMBER_FRAC_DIGIT: // [0-9]*
          patterns.numberFracDigit.lastIndex = index;
          match = patterns.numberFracDigit.exec(buffer);
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push({name: 'numberChunk', value});
            packNumbers && (accumulator += value);
            index += value.length;
          } else {
            if (index < buffer.length) {
              expect = NUMBER_EXPONENT;
              break;
            }
            if (done) {
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case NUMBER_EXPONENT: // [eE]?
          patterns.numberExponent.lastIndex = index;
          match = patterns.numberExponent.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              expect = expected[parent];
              break;
            }
            if (done) {
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = NUMBER_EXP_SIGN;
          index += value.length;
          break;
        case NUMBER_EXP_SIGN: // [-+]?
          patterns.numberExpSign.lastIndex = index;
          match = patterns.numberExpSign.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              expect = NUMBER_EXP_START;
              break;
            }
            if (done) throw new Error('Parser has expected an exponent value of a number');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = NUMBER_EXP_START;
          index += value.length;
          break;
        case NUMBER_EXP_START: // [0-9]
          patterns.numberExpStart.lastIndex = index;
          match = patterns.numberExpStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected an exponent part of a number');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = NUMBER_EXP_DIGIT;
          index += value.length;
          break;
        case NUMBER_EXP_DIGIT: // [0-9]*
          patterns.numberExpDigit.lastIndex = index;
          match = patterns.numberExpDigit.exec(buffer);
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push({name: 'numberChunk', value});
            packNumbers && (accumulator += value);
            index += value.length;
          } else {
            if (index < buffer.length || done) {
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case DONE:
          patterns.ws.lastIndex = index;
          match = patterns.ws.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              if (jsonStreaming) {
                if (openNumber) {
                  if (streamNumbers) tokens.push(tokenEndNumber);
                  openNumber = false;
                  if (packNumbers) {
                    tokens.push({name: 'numberValue', value: accumulator});
                    accumulator = '';
                  }
                }
                expect = VALUE;
                break;
              }
              throw new Error('Parser cannot parse input: unexpected characters');
            }
            break main; // wait for more input
          }
          value = match[0];
          if (openNumber) {
            if (streamNumbers) tokens.push(tokenEndNumber);
            openNumber = false;
            if (packNumbers) {
              tokens.push({name: 'numberValue', value: accumulator});
              accumulator = '';
            }
          }
          index += value.length;
          break;
      }
    }
    if (done && openNumber) {
      if (streamNumbers) tokens.push(tokenEndNumber);
      openNumber = false;
      if (packNumbers) {
        tokens.push({name: 'numberValue', value: accumulator});
        accumulator = '';
      }
    }
    buffer = buffer.slice(index);
    return tokens.length ? many(tokens) : none;
  });
};

const parser = options => gen(fixUtf8Stream(), jsonParser(options));

parser.parser = parser; // for backward compatibility with 1.x

export default parser;
export {parser, jsonParser};
