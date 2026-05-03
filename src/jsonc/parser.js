// @ts-self-types="./parser.d.ts"

'use strict';

const {asStream, flushable, gen, many, none} = require('stream-chain');
const fixUtf8Stream = require('stream-chain/utils/fixUtf8Stream.js');

const patterns = {
  value1: /[\"\{\[\]\-\d]|true\b|false\b|null\b|\s{1,256}|\/\/|\/\*/y,
  string: /[^\x00-\x1f\"\\]{1,256}|\\[bfnrt\"\\\/]|\\u[\da-fA-F]{4}|\"/y,
  key1: /[\"\}]|\s{1,256}|\/\/|\/\*/y,
  colon: /\:|\s{1,256}|\/\/|\/\*/y,
  comma: /[\,\]\}]|\s{1,256}|\/\/|\/\*/y,
  ws: /\s{1,256}|\/\/|\/\*/y,
  numberStart: /\d/y,
  numberDigit: /\d{0,256}/y,
  numberFraction: /[\.eE]/y,
  numberExponent: /[eE]/y,
  numberExpSign: /[-+]/y,
  lineComment: /[^\r\n]*(?:\r?\n|\r)?/y,
  blockComment: /(?:[^*]|\*(?!\/))*(?:\*\/)?/y
};
const MAX_PATTERN_SIZE = 16;

patterns.numberFracStart = patterns.numberExpStart = patterns.numberStart;
patterns.numberFracDigit = patterns.numberExpDigit = patterns.numberDigit;

const expected = {object: 'objectStop', array: 'arrayStop', '': 'done'};

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

const fromHex = s => String.fromCharCode(parseInt(s.slice(2), 16));

const codes = {b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\', '/': '/'};

const jsoncJsonParser = options => {
  let packKeys = true,
    packStrings = true,
    packNumbers = true,
    streamKeys = true,
    streamStrings = true,
    streamNumbers = true,
    jsonStreaming = false,
    streamWhitespace = true,
    streamComments = true;

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
    'streamWhitespace' in options && (streamWhitespace = options.streamWhitespace);
    'streamComments' in options && (streamComments = options.streamComments);
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

  const handleComment = (tokens, index) => {
    const c = buffer.charAt(index + 1);
    if (c === '/') {
      patterns.lineComment.lastIndex = index + 2;
      const m = patterns.lineComment.exec(buffer);
      const body = m[0];
      if (!done && !/[\r\n]/.test(body)) return -1;
      if (streamComments) tokens.push({name: 'comment', value: '//' + body});
      return index + 2 + body.length;
    }
    if (c === '*') {
      patterns.blockComment.lastIndex = index + 2;
      const m = patterns.blockComment.exec(buffer);
      const body = m[0];
      if (!body.endsWith('*/')) {
        if (done) throw new Error('Parser cannot parse input: unterminated block comment');
        return -1;
      }
      if (streamComments) tokens.push({name: 'comment', value: '/*' + body});
      return index + 2 + body.length;
    }
    return 0;
  };

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
        case 'value1':
        case 'value':
          patterns.value1.lastIndex = index;
          match = patterns.value1.exec(buffer);
          if (!match) {
            if (done || index + MAX_PATTERN_SIZE < buffer.length) {
              if (index < buffer.length) throw new Error('Parser cannot parse input: expected a value');
              throw new Error('Parser has expected a value');
            }
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            index = next;
            break;
          }
          if (value === '/*') {
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            if (next === 0) throw new Error('Parser cannot parse input: expected a value');
            index = next;
            break;
          }
          switch (value) {
            case '"':
              if (streamStrings) tokens.push(tokenStartString);
              expect = 'string';
              break;
            case '{':
              tokens.push(tokenStartObject);
              stack.push(parent);
              parent = 'object';
              expect = 'key1';
              break;
            case '[':
              tokens.push(tokenStartArray);
              stack.push(parent);
              parent = 'array';
              expect = 'value1';
              break;
            case ']':
              if (expect !== 'value1') throw new Error("Parser cannot parse input: unexpected token ']'");
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
              expect = 'numberStart';
              break;
            case '0':
              openNumber = true;
              if (streamNumbers) {
                tokens.push(tokenStartNumber, {name: 'numberChunk', value: '0'});
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
                tokens.push(tokenStartNumber, {name: 'numberChunk', value});
              }
              packNumbers && (accumulator = value);
              expect = 'numberDigit';
              break;
            case 'true':
            case 'false':
            case 'null':
              if (buffer.length - index === value.length && !done) break main;
              tokens.push(literalTokens[value]);
              expect = expected[parent];
              break;
            default:
              if (streamWhitespace) tokens.push({name: 'whitespace', value});
              break;
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
            break main;
          }
          value = match[0];
          if (value === '"') {
            if (expect === 'keyVal') {
              if (streamKeys) tokens.push(tokenEndKey);
              if (packKeys) {
                tokens.push({name: 'keyValue', value: accumulator});
                accumulator = '';
              }
              expect = 'colon';
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
            if (expect === 'keyVal' ? streamKeys : streamStrings) {
              tokens.push({name: 'stringChunk', value: t});
            }
            if (expect === 'keyVal' ? packKeys : packStrings) {
              accumulator += t;
            }
          } else {
            if (expect === 'keyVal' ? streamKeys : streamStrings) {
              tokens.push({name: 'stringChunk', value});
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
            if (index < buffer.length) {
              if (!done && buffer.charAt(index) === '/') break main;
              throw new Error('Parser cannot parse input: expected an object key');
            }
            if (done) throw new Error('Parser cannot parse input: expected an object key');
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            if (next === 0) throw new Error('Parser cannot parse input: expected an object key');
            index = next;
          } else if (value === '"') {
            if (streamKeys) tokens.push(tokenStartKey);
            expect = 'keyVal';
            index += value.length;
          } else if (value === '}') {
            if (expect !== 'key1') throw new Error("Parser cannot parse input: unexpected token '}'");
            tokens.push(tokenEndObject);
            parent = stack.pop();
            expect = expected[parent];
            index += value.length;
          } else {
            if (streamWhitespace) tokens.push({name: 'whitespace', value});
            index += value.length;
          }
          break;
        case 'colon':
          patterns.colon.lastIndex = index;
          match = patterns.colon.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              if (!done && buffer.charAt(index) === '/') break main;
              throw new Error("Parser cannot parse input: expected ':'");
            }
            if (done) throw new Error("Parser cannot parse input: expected ':'");
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            if (next === 0) throw new Error("Parser cannot parse input: expected ':'");
            index = next;
          } else if (value === ':') {
            expect = 'value';
            index += value.length;
          } else {
            if (streamWhitespace) tokens.push({name: 'whitespace', value});
            index += value.length;
          }
          break;
        case 'arrayStop':
        case 'objectStop':
          patterns.comma.lastIndex = index;
          match = patterns.comma.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              if (!done && buffer.charAt(index) === '/') break main;
              throw new Error("Parser cannot parse input: expected ','");
            }
            if (done) throw new Error("Parser cannot parse input: expected ','");
            break main;
          }
          value = match[0];
          if (value === '//') {
            if (openNumber) {
              if (streamNumbers) tokens.push(tokenEndNumber);
              openNumber = false;
              if (packNumbers) {
                tokens.push({name: 'numberValue', value: accumulator});
                accumulator = '';
              }
            }
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            if (openNumber) {
              if (streamNumbers) tokens.push(tokenEndNumber);
              openNumber = false;
              if (packNumbers) {
                tokens.push({name: 'numberValue', value: accumulator});
                accumulator = '';
              }
            }
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            if (next === 0) throw new Error("Parser cannot parse input: expected ','");
            index = next;
          } else {
            if (openNumber) {
              if (streamNumbers) tokens.push(tokenEndNumber);
              openNumber = false;
              if (packNumbers) {
                tokens.push({name: 'numberValue', value: accumulator});
                accumulator = '';
              }
            }
            if (value === ',') {
              expect = expect === 'arrayStop' ? 'value1' : 'key1';
            } else if (value === '}' || value === ']') {
              if (value === '}' ? expect === 'arrayStop' : expect !== 'arrayStop') {
                throw new Error("Parser cannot parse input: expected '" + (expect === 'arrayStop' ? ']' : '}') + "'");
              }
              tokens.push(value === '}' ? tokenEndObject : tokenEndArray);
              parent = stack.pop();
              expect = expected[parent];
            } else {
              if (streamWhitespace) tokens.push({name: 'whitespace', value});
            }
            index += value.length;
          }
          break;
        case 'numberStart':
          patterns.numberStart.lastIndex = index;
          match = patterns.numberStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a starting digit');
            break main;
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = value === '0' ? 'numberFraction' : 'numberDigit';
          index += value.length;
          break;
        case 'numberDigit':
          patterns.numberDigit.lastIndex = index;
          match = patterns.numberDigit.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a digit');
            break main;
          }
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push({name: 'numberChunk', value});
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
            break main;
          }
          break;
        case 'numberFraction':
          patterns.numberFraction.lastIndex = index;
          match = patterns.numberFraction.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) {
              expect = expected[parent];
              break;
            }
            break main;
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = value === '.' ? 'numberFracStart' : 'numberExpSign';
          index += value.length;
          break;
        case 'numberFracStart':
          patterns.numberFracStart.lastIndex = index;
          match = patterns.numberFracStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a fractional part of a number');
            break main;
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = 'numberFracDigit';
          index += value.length;
          break;
        case 'numberFracDigit':
          patterns.numberFracDigit.lastIndex = index;
          match = patterns.numberFracDigit.exec(buffer);
          value = match[0];
          if (value) {
            if (streamNumbers) tokens.push({name: 'numberChunk', value});
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
            break main;
          }
          break;
        case 'numberExponent':
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
            break main;
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = 'numberExpSign';
          index += value.length;
          break;
        case 'numberExpSign':
          patterns.numberExpSign.lastIndex = index;
          match = patterns.numberExpSign.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              expect = 'numberExpStart';
              break;
            }
            if (done) throw new Error('Parser has expected an exponent value of a number');
            break main;
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = 'numberExpStart';
          index += value.length;
          break;
        case 'numberExpStart':
          patterns.numberExpStart.lastIndex = index;
          match = patterns.numberExpStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected an exponent part of a number');
            break main;
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = 'numberExpDigit';
          index += value.length;
          break;
        case 'numberExpDigit':
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
            break main;
          }
          break;
        case 'done':
          patterns.ws.lastIndex = index;
          match = patterns.ws.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              if (!done && buffer.charAt(index) === '/') break main;
              if (jsonStreaming) {
                if (openNumber) {
                  if (streamNumbers) tokens.push(tokenEndNumber);
                  openNumber = false;
                  if (packNumbers) {
                    tokens.push({name: 'numberValue', value: accumulator});
                    accumulator = '';
                  }
                }
                expect = 'value';
                break;
              }
              throw new Error('Parser cannot parse input: unexpected characters');
            }
            break main;
          }
          value = match[0];
          if (value === '//') {
            if (openNumber) {
              if (streamNumbers) tokens.push(tokenEndNumber);
              openNumber = false;
              if (packNumbers) {
                tokens.push({name: 'numberValue', value: accumulator});
                accumulator = '';
              }
            }
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            if (openNumber) {
              if (streamNumbers) tokens.push(tokenEndNumber);
              openNumber = false;
              if (packNumbers) {
                tokens.push({name: 'numberValue', value: accumulator});
                accumulator = '';
              }
            }
            const next = handleComment(tokens, index);
            if (next === -1) break main;
            if (next === 0) throw new Error('Parser cannot parse input: unexpected characters');
            index = next;
          } else {
            if (openNumber) {
              if (streamNumbers) tokens.push(tokenEndNumber);
              openNumber = false;
              if (packNumbers) {
                tokens.push({name: 'numberValue', value: accumulator});
                accumulator = '';
              }
            }
            if (streamWhitespace) tokens.push({name: 'whitespace', value});
            index += value.length;
          }
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

const jsoncParser = options => gen(fixUtf8Stream(), jsoncJsonParser(options));

jsoncParser.asStream = options => asStream(jsoncParser(options), options);
jsoncParser.parser = jsoncParser;
jsoncParser.jsoncParser = jsoncParser;

module.exports = jsoncParser;
