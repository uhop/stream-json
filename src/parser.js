// @ts-self-types="./parser.d.ts"

'use strict';

const {asStream, flushable, gen, many, none} = require('stream-chain');
const fixUtf8Stream = require('stream-chain/utils/fixUtf8Stream.js');

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

const values = {true: true, false: false, null: null},
  expected = {object: 'objectStop', array: 'arrayStop', '': 'done'};

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
    expect = jsonStreaming ? 'done' : 'value',
    parent = '',
    openNumber = false,
    accumulator = '',
    buffer = '';

  const stack = [];

  return flushable(buf => {
    const tokens = [];

    if (buf === none) {
      done = true;
      if (openNumber) {
        if (streamNumbers) tokens.push( {name: 'endNumber'});
        openNumber = false;
        if (packNumbers) {
          tokens.push( {name: 'numberValue', value: accumulator});
          accumulator = '';
        }
      }
      return tokens.length ? many(tokens) : none;
    }

    buffer += buf;

    let match,
      value,
      index = 0;

    main: for (;;) {
      switch (expect) {
        case 'value1':
        case 'value':
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
              if (streamStrings) tokens.push( {name: 'startString'});
              expect = 'string';
              break;
            case '{':
              tokens.push( {name: 'startObject'});
              stack.push(parent);
              parent = 'object';
              expect = 'key1';
              break;
            case '[':
              tokens.push( {name: 'startArray'});
              stack.push(parent);
              parent = 'array';
              expect = 'value1';
              break;
            case ']':
              if (expect !== 'value1') throw new Error("Parser cannot parse input: unexpected token ']'");
              if (openNumber) {
                if (streamNumbers) tokens.push( {name: 'endNumber'});
                openNumber = false;
                if (packNumbers) {
                  tokens.push( {name: 'numberValue', value: accumulator});
                  accumulator = '';
                }
              }
              tokens.push( {name: 'endArray'});
              parent = stack.pop();
              expect = expected[parent];
              break;
            case '-':
              openNumber = true;
              if (streamNumbers) {
                tokens.push( {name: 'startNumber'},{name: 'numberChunk', value: '-'});
              }
              packNumbers && (accumulator = '-');
              expect = 'numberStart';
              break;
            case '0':
              openNumber = true;
              if (streamNumbers) {
                tokens.push( {name: 'startNumber'},{name: 'numberChunk', value: '0'});
              }
              packNumbers && (accumulator = '0');
              expect = 'numberFraction';
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
                tokens.push( {name: 'startNumber'}, {name: 'numberChunk', value: value});
              }
              packNumbers && (accumulator = value);
              expect = 'numberDigit';
              break;
            case 'true':
            case 'false':
            case 'null':
              if (buffer.length - index === value.length && !done) break main; // wait for more input
              tokens.push( {name: value + 'Value', value: values[value]});
              expect = expected[parent];
              break;
            // default: // ws
          }
          index += value.length;
          break;
        case 'keyVal':
        case 'string':
          patterns.string.lastIndex = index;
          match = patterns.string.exec(buffer);
          if (!match) {
            if (index < buffer.length && (done || buffer.length - index >= 6)) throw new Error('Parser cannot parse input: escaped characters');
            if (done) throw new Error('Parser has expected a string value');
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            if (expect === 'keyVal') {
              if (streamKeys) tokens.push( {name: 'endKey'});
              if (packKeys) {
                tokens.push( {name: 'keyValue', value: accumulator});
                accumulator = '';
              }
              expect = 'colon';
            } else {
              if (streamStrings) tokens.push( {name: 'endString'});
              if (packStrings) {
                tokens.push( {name: 'stringValue', value: accumulator});
                accumulator = '';
              }
              expect = expected[parent];
            }
          } else if (value.length > 1 && value.charAt(0) === '\\') {
            const t = value.length == 2 ? codes[value.charAt(1)] : fromHex(value);
            if (expect === 'keyVal' ? streamKeys : streamStrings) {
              tokens.push( {name: 'stringChunk', value: t});
            }
            if (expect === 'keyVal' ? packKeys : packStrings) {
              accumulator += t;
            }
          } else {
            if (expect === 'keyVal' ? streamKeys : streamStrings) {
              tokens.push( {name: 'stringChunk', value: value});
            }
            if (expect === 'keyVal' ? packKeys : packStrings) {
              accumulator += value;
            }
          }
          index += value.length;
          break;
        case 'key1':
        case 'key':
          patterns.key1.lastIndex = index;
          match = patterns.key1.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected an object key');
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            if (streamKeys) tokens.push( {name: 'startKey'});
            expect = 'keyVal';
          } else if (value === '}') {
            if (expect !== 'key1') throw new Error("Parser cannot parse input: unexpected token '}'");
            tokens.push( {name: 'endObject'});
            parent = stack.pop();
            expect = expected[parent];
          }
          index += value.length;
          break;
        case 'colon':
          patterns.colon.lastIndex = index;
          match = patterns.colon.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error("Parser cannot parse input: expected ':'");
            break main; // wait for more input
          }
          value = match[0];
          value === ':' && (expect = 'value');
          index += value.length;
          break;
        case 'arrayStop':
        case 'objectStop':
          patterns.comma.lastIndex = index;
          match = patterns.comma.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error("Parser cannot parse input: expected ','");
            break main; // wait for more input
          }
          if (openNumber) {
            if (streamNumbers) tokens.push( {name: 'endNumber'});
            openNumber = false;
            if (packNumbers) {
              tokens.push( {name: 'numberValue', value: accumulator});
              accumulator = '';
            }
          }
          value = match[0];
          if (value === ',') {
            expect = expect === 'arrayStop' ? 'value' : 'key';
          } else if (value === '}' || value === ']') {
            if (value === '}' ? expect === 'arrayStop' : expect !== 'arrayStop') {
              throw new Error("Parser cannot parse input: expected '" + (expect === 'arrayStop' ? ']' : '}') + "'");
            }
            tokens.push( {name: value === '}' ? 'endObject' : 'endArray'});
            parent = stack.pop();
            expect = expected[parent];
          }
          index += value.length;
          break;
        // number chunks
        case 'numberStart': // [0-9]
          patterns.numberStart.lastIndex = index;
          match = patterns.numberStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a starting digit');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
          packNumbers && (accumulator += value);
          expect = value === '0' ? 'numberFraction' : 'numberDigit';
          index += value.length;
          break;
        case 'numberDigit': // [0-9]*
          patterns.numberDigit.lastIndex = index;
          match = patterns.numberDigit.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a digit');
            break main; // wait for more input
          }
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
            packNumbers && (accumulator += value);
            index += value.length;
          } else {
            if (index < buffer.length) {
              expect = 'numberFraction';
              break;
            }
            if (done) {
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case 'numberFraction': // [\.eE]?
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
          if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
          packNumbers && (accumulator += value);
          expect = value === '.' ? 'numberFracStart' : 'numberExpSign';
          index += value.length;
          break;
        case 'numberFracStart': // [0-9]
          patterns.numberFracStart.lastIndex = index;
          match = patterns.numberFracStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a fractional part of a number');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
          packNumbers && (accumulator += value);
          expect = 'numberFracDigit';
          index += value.length;
          break;
        case 'numberFracDigit': // [0-9]*
          patterns.numberFracDigit.lastIndex = index;
          match = patterns.numberFracDigit.exec(buffer);
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
            packNumbers && (accumulator += value);
            index += value.length;
          } else {
            if (index < buffer.length) {
              expect = 'numberExponent';
              break;
            }
            if (done) {
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case 'numberExponent': // [eE]?
          patterns.numberExponent.lastIndex = index;
          match = patterns.numberExponent.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              expect = expected[parent];
              break;
            }
            if (done) {
              expect = 'done';
              break;
            }
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
          packNumbers && (accumulator += value);
          expect = 'numberExpSign';
          index += value.length;
          break;
        case 'numberExpSign': // [-+]?
          patterns.numberExpSign.lastIndex = index;
          match = patterns.numberExpSign.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              expect = 'numberExpStart';
              break;
            }
            if (done) throw new Error('Parser has expected an exponent value of a number');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
          packNumbers && (accumulator += value);
          expect = 'numberExpStart';
          index += value.length;
          break;
        case 'numberExpStart': // [0-9]
          patterns.numberExpStart.lastIndex = index;
          match = patterns.numberExpStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected an exponent part of a number');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
          packNumbers && (accumulator += value);
          expect = 'numberExpDigit';
          index += value.length;
          break;
        case 'numberExpDigit': // [0-9]*
          patterns.numberExpDigit.lastIndex = index;
          match = patterns.numberExpDigit.exec(buffer);
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push( {name: 'numberChunk', value: value});
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
        case 'done':
          patterns.ws.lastIndex = index;
          match = patterns.ws.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              if (jsonStreaming) {
                expect = 'value';
                break;
              }
              throw new Error('Parser cannot parse input: unexpected characters');
            }
            break main; // wait for more input
          }
          value = match[0];
          if (openNumber) {
            if (streamNumbers) tokens.push( {name: 'endNumber'});
            openNumber = false;
            if (packNumbers) {
              tokens.push( {name: 'numberValue', value: accumulator});
              accumulator = '';
            }
          }
          index += value.length;
          break;
      }
    }
    buffer = buffer.slice(index);
    return tokens.length ? many(tokens) : none;
  });
};

const parser = options => gen(fixUtf8Stream(), jsonParser(options));

parser.asStream = options => asStream(parser(options), options);

module.exports = parser;
module.exports.parser = parser; // for backward compatibility with 1.x
