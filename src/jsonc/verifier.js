// @ts-self-types="./verifier.d.ts"

'use strict';

const {asStream, flushable, gen, none} = require('stream-chain');
const fixUtf8Stream = require('stream-chain/utils/fixUtf8Stream.js');

const patterns = {
  value1: /[\"\{\[\]\-\d]|true\b|false\b|null\b|\s{1,256}|\/\/|\/\*/y,
  string: /[^\x00-\x1f\"\\]{1,256}|\\[bfnrt\"\\/]|\\u[\da-fA-F]{4}|\"/y,
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

const eol = /[\u000A\u2028\u2029]|\u000D\u000A|\u000D/g;

const expected = {object: 'objectStop', array: 'arrayStop', '': 'done'};

const jsoncVerifier = options => {
  let jsonStreaming = false;
  if (options) {
    jsonStreaming = options.jsonStreaming;
  }

  let buffer = '';
  let done = false;
  let expect = jsonStreaming ? 'done' : 'value';
  const stack = [];
  let parent = '';

  let line = 1,
    pos = 1;
  let offset = 0;

  const makeError = msg => {
    const error = /** @type {Error & {line: number, pos: number, offset: number}} */ (new Error('ERROR at ' + offset + ' (' + line + ', ' + pos + '): ' + msg));
    error.line = line;
    error.pos = pos;
    error.offset = offset;
    return error;
  };

  const updatePos = value => {
    let len = value.length;
    offset += len;
    value.replace(eol, (match, matchOffset) => {
      len = value.length - match.length - matchOffset;
      ++line;
      pos = 1;
      return '';
    });
    pos += len;
  };

  const handleComment = index => {
    const c = buffer.charAt(index + 1);
    if (c === '/') {
      patterns.lineComment.lastIndex = index + 2;
      const m = patterns.lineComment.exec(buffer);
      const body = m[0];
      if (!done && !/[\r\n]/.test(body)) return -1;
      updatePos('//' + body);
      return index + 2 + body.length;
    }
    if (c === '*') {
      patterns.blockComment.lastIndex = index + 2;
      const m = patterns.blockComment.exec(buffer);
      const body = m[0];
      if (!body.endsWith('*/')) {
        if (done) throw makeError('Verifier cannot parse input: unterminated block comment');
        return -1;
      }
      updatePos('/*' + body);
      return index + 2 + body.length;
    }
    return 0;
  };

  const processBuffer = () => {
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
              if (index < buffer.length) throw makeError('Verifier cannot parse input: expected a value');
              throw makeError('Verifier has expected a value');
            }
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(index);
            if (next === -1) break main;
            index = next;
            break;
          }
          if (value === '/*') {
            const next = handleComment(index);
            if (next === -1) break main;
            if (next === 0) throw makeError('Verifier cannot parse input: expected a value');
            index = next;
            break;
          }
          switch (value) {
            case '"':
              expect = 'string';
              break;
            case '{':
              stack.push(parent);
              parent = 'object';
              expect = 'key1';
              break;
            case '[':
              stack.push(parent);
              parent = 'array';
              expect = 'value1';
              break;
            case ']':
              if (expect !== 'value1') throw makeError("Verifier cannot parse input: unexpected token ']'");
              parent = stack.pop();
              expect = expected[parent];
              break;
            case '-':
              expect = 'numberStart';
              break;
            case '0':
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
              expect = 'numberDigit';
              break;
            case 'true':
            case 'false':
            case 'null':
              if (buffer.length - index === value.length && !done) break main;
              expect = expected[parent];
              break;
            // default: // ws
          }
          updatePos(value);
          index += value.length;
          break;
        case 'keyVal':
        case 'string':
          patterns.string.lastIndex = index;
          match = patterns.string.exec(buffer);
          if (!match) {
            if (index < buffer.length && (done || buffer.length - index >= 6)) throw makeError('Verifier cannot parse input: escaped characters');
            if (done) throw makeError('Verifier has expected a string value');
            break main;
          }
          value = match[0];
          if (value === '"') {
            if (expect === 'keyVal') {
              expect = 'colon';
            } else {
              expect = expected[parent];
            }
          }
          updatePos(value);
          index += value.length;
          break;
        case 'key1':
        case 'key':
          patterns.key1.lastIndex = index;
          match = patterns.key1.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              if (!done && buffer.charAt(index) === '/') break main;
              throw makeError('Verifier cannot parse input: expected an object key');
            }
            if (done) throw makeError('Verifier cannot parse input: expected an object key');
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            const next = handleComment(index);
            if (next === -1) break main;
            if (next === 0) throw makeError('Verifier cannot parse input: expected an object key');
            index = next;
          } else if (value === '"') {
            expect = 'keyVal';
            updatePos(value);
            index += value.length;
          } else if (value === '}') {
            if (expect !== 'key1') throw makeError("Verifier cannot parse input: unexpected token '}'");
            parent = stack.pop();
            expect = expected[parent];
            updatePos(value);
            index += value.length;
          } else {
            updatePos(value);
            index += value.length;
          }
          break;
        case 'colon':
          patterns.colon.lastIndex = index;
          match = patterns.colon.exec(buffer);
          if (!match) {
            if (index < buffer.length) {
              if (!done && buffer.charAt(index) === '/') break main;
              throw makeError("Verifier cannot parse input: expected ':'");
            }
            if (done) throw makeError("Verifier cannot parse input: expected ':'");
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            const next = handleComment(index);
            if (next === -1) break main;
            if (next === 0) throw makeError("Verifier cannot parse input: expected ':'");
            index = next;
          } else if (value === ':') {
            expect = 'value';
            updatePos(value);
            index += value.length;
          } else {
            updatePos(value);
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
              throw makeError("Verifier cannot parse input: expected ','");
            }
            if (done) throw makeError("Verifier cannot parse input: expected ','");
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            const next = handleComment(index);
            if (next === -1) break main;
            if (next === 0) throw makeError("Verifier cannot parse input: expected ','");
            index = next;
          } else {
            if (value === ',') {
              expect = expect === 'arrayStop' ? 'value1' : 'key1';
            } else if (value === '}' || value === ']') {
              if (value === '}' ? expect === 'arrayStop' : expect !== 'arrayStop') {
                throw makeError("Verifier cannot parse input: expected '" + (expect === 'arrayStop' ? ']' : '}') + "'");
              }
              parent = stack.pop();
              expect = expected[parent];
            }
            updatePos(value);
            index += value.length;
          }
          break;
        case 'numberStart':
          patterns.numberStart.lastIndex = index;
          match = patterns.numberStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected a starting digit');
            break main;
          }
          value = match[0];
          expect = value === '0' ? 'numberFraction' : 'numberDigit';
          updatePos(value);
          index += value.length;
          break;
        case 'numberDigit':
          patterns.numberDigit.lastIndex = index;
          match = patterns.numberDigit.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected a digit');
            break main;
          }
          value = match[0];
          if (value) {
            updatePos(value);
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
          expect = value === '.' ? 'numberFracStart' : 'numberExpSign';
          updatePos(value);
          index += value.length;
          break;
        case 'numberFracStart':
          patterns.numberFracStart.lastIndex = index;
          match = patterns.numberFracStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected a fractional part of a number');
            break main;
          }
          value = match[0];
          expect = 'numberFracDigit';
          updatePos(value);
          index += value.length;
          break;
        case 'numberFracDigit':
          patterns.numberFracDigit.lastIndex = index;
          match = patterns.numberFracDigit.exec(buffer);
          value = match[0];
          if (value) {
            updatePos(value);
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
          expect = 'numberExpSign';
          updatePos(value);
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
            if (done) throw makeError('Verifier has expected an exponent value of a number');
            break main;
          }
          value = match[0];
          expect = 'numberExpStart';
          updatePos(value);
          index += value.length;
          break;
        case 'numberExpStart':
          patterns.numberExpStart.lastIndex = index;
          match = patterns.numberExpStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected an exponent part of a number');
            break main;
          }
          value = match[0];
          expect = 'numberExpDigit';
          updatePos(value);
          index += value.length;
          break;
        case 'numberExpDigit':
          patterns.numberExpDigit.lastIndex = index;
          match = patterns.numberExpDigit.exec(buffer);
          value = match[0];
          if (value) {
            updatePos(value);
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
                expect = 'value';
                break;
              }
              throw makeError('Verifier cannot parse input: unexpected characters');
            }
            break main;
          }
          value = match[0];
          if (value === '//') {
            const next = handleComment(index);
            if (next === -1) break main;
            index = next;
          } else if (value === '/*') {
            const next = handleComment(index);
            if (next === -1) break main;
            if (next === 0) throw makeError('Verifier cannot parse input: unexpected characters');
            index = next;
          } else {
            updatePos(value);
            index += value.length;
          }
          break;
      }
    }
    buffer = buffer.slice(index);
  };

  const validate = flushable(chunk => {
    if (chunk === none) {
      done = true;
      processBuffer();
      return none;
    }
    buffer += chunk;
    processBuffer();
    return none;
  });

  return gen(fixUtf8Stream(), validate);
};

jsoncVerifier.asStream = options => asStream(jsoncVerifier(options), {...options, writableObjectMode: false, readableObjectMode: false});
jsoncVerifier.jsoncVerifier = jsoncVerifier;
jsoncVerifier.verifier = jsoncVerifier;

module.exports = jsoncVerifier;
