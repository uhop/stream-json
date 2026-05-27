// @ts-self-types="./parser.d.ts"

// charCodeAt-based JSONC tokenizer. Same techniques as the JSON parser
// (src/core/parser.js): structural classification, whitespace handling and
// comment detection use charCodeAt + integer compares instead of regex
// alternations; short strings, keys and numbers take a whole-lexeme fast path
// (one regex match / one charCodeAt scan -> one set of tokens). Escapes, long
// (>256) strings, literals (true/false/null) and any lexeme that abuts the
// buffer tail fall back to the incremental regex state machine below,
// preserving exact resumability and error behavior. JSONC adds whitespace
// tokens and `//` / `/*` comment tokens, handled inline during trivia scanning.

import {flushable, gen, many, none} from 'stream-chain/core';

import fixUtf8Stream from 'stream-chain/utils/fixUtf8Stream.js';

const patterns = {
  string: /[^\x00-\x1f\"\\]{1,256}|\\[bfnrt\"\\\/]|\\u[\da-fA-F]{4}|\"/y,
  literal: /true\b|false\b|null\b/y,
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

// long hexadecimal codes: \uXXXX
const fromHex = s => String.fromCharCode(parseInt(s.slice(2), 16));

// short codes: \b \f \n \r \t \" \\ \/
const codes = {b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\', '/': '/'};

// ASCII code points of the JSON(C) syntax characters (each folds to a constant at load)
const ASCII_TAB = '\t'.charCodeAt(0),
  ASCII_LF = '\n'.charCodeAt(0),
  ASCII_CR = '\r'.charCodeAt(0),
  ASCII_SPACE = ' '.charCodeAt(0),
  ASCII_QUOTE = '"'.charCodeAt(0),
  ASCII_BACKSLASH = '\\'.charCodeAt(0),
  ASCII_SLASH = '/'.charCodeAt(0),
  ASCII_STAR = '*'.charCodeAt(0),
  ASCII_OPEN_BRACE = '{'.charCodeAt(0),
  ASCII_CLOSE_BRACE = '}'.charCodeAt(0),
  ASCII_OPEN_BRACKET = '['.charCodeAt(0),
  ASCII_CLOSE_BRACKET = ']'.charCodeAt(0),
  ASCII_MINUS = '-'.charCodeAt(0),
  ASCII_COLON = ':'.charCodeAt(0),
  ASCII_COMMA = ','.charCodeAt(0),
  ASCII_ZERO = '0'.charCodeAt(0),
  ASCII_NINE = '9'.charCodeAt(0),
  ASCII_UPPER_A = 'A'.charCodeAt(0),
  ASCII_UPPER_F = 'F'.charCodeAt(0),
  ASCII_LOWER_A = 'a'.charCodeAt(0),
  ASCII_LOWER_F = 'f'.charCodeAt(0),
  ASCII_LOWER_N = 'n'.charCodeAt(0),
  ASCII_LOWER_T = 't'.charCodeAt(0),
  ASCII_LOWER_U = 'u'.charCodeAt(0);

// fast-path helpers
// char codes that legally terminate a number lexeme: , } ] and JSON whitespace
// (a number may also abut a comment, but `/` is excluded so that path falls
// back to the incremental machine, where comments are handled by the stop state)
const TERM = [];
for (const ch of ',}] \t\n\r') TERM[ch.charCodeAt(0)] = 1;
const numberFull = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?/y;
const HEX = c => (c >= ASCII_ZERO && c <= ASCII_NINE) || (c >= ASCII_UPPER_A && c <= ASCII_UPPER_F) || (c >= ASCII_LOWER_A && c <= ASCII_LOWER_F);

const jsoncParser = options => {
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

  // set by consumeTrivia when it stops on an incomplete comment and the caller
  // must wait for more input (break main, keeping the buffer from the returned
  // index — which points at the start of the incomplete comment)
  let triviaWait = false;

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

  // Consume leading whitespace runs (emitting whitespace tokens) and comments.
  // Returns the index of the first non-trivia character (or buffer.length if
  // exhausted). Sets triviaWait when it stops on an incomplete comment: the
  // returned index then points at that comment's start, so the caller breaks
  // main and the buffer keeps it. A `/` that is not the start of a comment (or
  // a lone `/` at EOF) is returned as a structural character for the caller to
  // reject.
  const consumeTrivia = (tokens, idx) => {
    triviaWait = false;
    for (;;) {
      const wsStart = idx;
      while (idx < buffer.length) {
        const c = buffer.charCodeAt(idx);
        if (c === ASCII_SPACE || c === ASCII_TAB || c === ASCII_LF || c === ASCII_CR) {
          ++idx;
          continue;
        }
        break;
      }
      if (idx > wsStart && streamWhitespace) tokens.push({name: 'whitespace', value: buffer.slice(wsStart, idx)});
      if (idx >= buffer.length) return idx; // exhausted — caller decides wait vs. done
      if (buffer.charCodeAt(idx) !== ASCII_SLASH) return idx; // structural character
      if (idx + 1 >= buffer.length) {
        if (done) return idx; // lone '/' at EOF — let the caller reject it
        triviaWait = true;
        return idx; // wait for the second comment character
      }
      const c2 = buffer.charCodeAt(idx + 1);
      if (c2 !== ASCII_SLASH && c2 !== ASCII_STAR) return idx; // not a comment — caller rejects
      const next = handleComment(tokens, idx);
      if (next === -1) {
        triviaWait = true;
        return idx; // incomplete comment body — wait, keeping it in the buffer
      }
      idx = next;
    }
  };

  return flushable(buf => {
    const tokens = [];

    if (buf === none) {
      done = true;
    } else {
      buffer += buf;
    }

    let match,
      fm,
      s,
      e,
      q,
      rs,
      cc,
      value,
      index = 0;

    main: for (;;) {
      switch (expect) {
        case 'value1':
        case 'value': {
          index = consumeTrivia(tokens, index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw new Error('Parser has expected a value');
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_QUOTE) {
            // string: charCodeAt whole-string scan (decodes escapes)
            q = index + 1;
            rs = q;
            s = '';
            for (;;) {
              if (q >= buffer.length) {
                q = -1;
                break;
              }
              e = buffer.charCodeAt(q);
              if (e === ASCII_QUOTE) {
                s += buffer.slice(rs, q);
                break;
              }
              if (e < ASCII_SPACE) {
                q = -1;
                break;
              }
              if (e === ASCII_BACKSLASH) {
                if (q + 1 >= buffer.length) {
                  q = -1;
                  break;
                }
                cc = buffer.charCodeAt(q + 1);
                if (cc === ASCII_LOWER_U) {
                  if (
                    q + 6 > buffer.length ||
                    !(HEX(buffer.charCodeAt(q + 2)) && HEX(buffer.charCodeAt(q + 3)) && HEX(buffer.charCodeAt(q + 4)) && HEX(buffer.charCodeAt(q + 5)))
                  ) {
                    q = -1;
                    break;
                  }
                  s += buffer.slice(rs, q) + String.fromCharCode(parseInt(buffer.slice(q + 2, q + 6), 16));
                  q += 6;
                } else {
                  value = codes[buffer.charAt(q + 1)];
                  if (value === undefined) {
                    q = -1;
                    break;
                  }
                  s += buffer.slice(rs, q) + value;
                  q += 2;
                }
                rs = q;
                continue;
              }
              ++q;
            }
            if (q >= 0) {
              if (streamStrings) {
                tokens.push(tokenStartString);
                if (s) tokens.push({name: 'stringChunk', value: s});
                tokens.push(tokenEndString);
              }
              if (packStrings) tokens.push({name: 'stringValue', value: s});
              index = q + 1;
              expect = expected[parent];
              continue main;
            }
            // fall back to incremental string machine
            if (streamStrings) tokens.push(tokenStartString);
            expect = 'string';
            ++index;
            continue main;
          }
          if (cc === ASCII_OPEN_BRACE) {
            tokens.push(tokenStartObject);
            stack.push(parent);
            parent = 'object';
            expect = 'key1';
            ++index;
            continue main;
          }
          if (cc === ASCII_OPEN_BRACKET) {
            tokens.push(tokenStartArray);
            stack.push(parent);
            parent = 'array';
            expect = 'value1';
            ++index;
            continue main;
          }
          if (cc === ASCII_CLOSE_BRACKET) {
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
            ++index;
            continue main;
          }
          if (cc === ASCII_MINUS || (cc >= ASCII_ZERO && cc <= ASCII_NINE)) {
            // number: try whole-number fast path (only with a clear terminator in buffer)
            numberFull.lastIndex = index;
            fm = numberFull.exec(buffer);
            if (fm) {
              e = index + fm[0].length;
              if (e < buffer.length && TERM[buffer.charCodeAt(e)]) {
                s = fm[0];
                if (streamNumbers) tokens.push(tokenStartNumber, {name: 'numberChunk', value: s}, tokenEndNumber);
                if (packNumbers) tokens.push({name: 'numberValue', value: s});
                index = e;
                expect = expected[parent];
                continue main;
              }
            }
            // fall back to incremental number machine (mirrors the value1 branches)
            openNumber = true;
            if (cc === ASCII_MINUS) {
              if (streamNumbers) tokens.push(tokenStartNumber, {name: 'numberChunk', value: '-'});
              packNumbers && (accumulator = '-');
              expect = 'numberStart';
            } else if (cc === ASCII_ZERO) {
              if (streamNumbers) tokens.push(tokenStartNumber, {name: 'numberChunk', value: '0'});
              packNumbers && (accumulator = '0');
              expect = 'numberFraction';
            } else {
              s = buffer.charAt(index);
              if (streamNumbers) tokens.push(tokenStartNumber, {name: 'numberChunk', value: s});
              packNumbers && (accumulator = s);
              expect = 'numberDigit';
            }
            ++index;
            continue main;
          }
          if (cc === ASCII_LOWER_T || cc === ASCII_LOWER_F || cc === ASCII_LOWER_N) {
            // true / false / null — regex for exact \b + wait semantics
            patterns.literal.lastIndex = index;
            match = patterns.literal.exec(buffer);
            if (!match) {
              if (done || index + MAX_PATTERN_SIZE < buffer.length) {
                throw new Error('Parser cannot parse input: expected a value');
              }
              break main; // wait for more input
            }
            value = match[0];
            if (buffer.length - index === value.length && !done) break main; // wait for boundary
            tokens.push(literalTokens[value]);
            expect = expected[parent];
            index += value.length;
            continue main;
          }
          throw new Error('Parser cannot parse input: expected a value');
        }
        // incremental string body (escapes / long / cross-chunk)
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
        case 'key': {
          index = consumeTrivia(tokens, index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw new Error('Parser cannot parse input: expected an object key');
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_QUOTE) {
            // key string: charCodeAt whole-key scan (decodes escapes)
            q = index + 1;
            rs = q;
            s = '';
            for (;;) {
              if (q >= buffer.length) {
                q = -1;
                break;
              }
              e = buffer.charCodeAt(q);
              if (e === ASCII_QUOTE) {
                s += buffer.slice(rs, q);
                break;
              }
              if (e < ASCII_SPACE) {
                q = -1;
                break;
              }
              if (e === ASCII_BACKSLASH) {
                if (q + 1 >= buffer.length) {
                  q = -1;
                  break;
                }
                cc = buffer.charCodeAt(q + 1);
                if (cc === ASCII_LOWER_U) {
                  if (
                    q + 6 > buffer.length ||
                    !(HEX(buffer.charCodeAt(q + 2)) && HEX(buffer.charCodeAt(q + 3)) && HEX(buffer.charCodeAt(q + 4)) && HEX(buffer.charCodeAt(q + 5)))
                  ) {
                    q = -1;
                    break;
                  }
                  s += buffer.slice(rs, q) + String.fromCharCode(parseInt(buffer.slice(q + 2, q + 6), 16));
                  q += 6;
                } else {
                  value = codes[buffer.charAt(q + 1)];
                  if (value === undefined) {
                    q = -1;
                    break;
                  }
                  s += buffer.slice(rs, q) + value;
                  q += 2;
                }
                rs = q;
                continue;
              }
              ++q;
            }
            if (q >= 0) {
              if (streamKeys) {
                tokens.push(tokenStartKey);
                if (s) tokens.push({name: 'stringChunk', value: s});
                tokens.push(tokenEndKey);
              }
              if (packKeys) tokens.push({name: 'keyValue', value: s});
              index = q + 1;
              expect = 'colon';
              continue main;
            }
            if (streamKeys) tokens.push(tokenStartKey);
            expect = 'keyVal';
            ++index;
            continue main;
          }
          if (cc === ASCII_CLOSE_BRACE) {
            if (expect !== 'key1') throw new Error("Parser cannot parse input: unexpected token '}'");
            tokens.push(tokenEndObject);
            parent = stack.pop();
            expect = expected[parent];
            ++index;
            continue main;
          }
          throw new Error('Parser cannot parse input: expected an object key');
        }
        case 'colon': {
          index = consumeTrivia(tokens, index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw new Error("Parser cannot parse input: expected ':'");
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_COLON) {
            expect = 'value';
            ++index;
            continue main;
          }
          throw new Error("Parser cannot parse input: expected ':'");
        }
        case 'arrayStop':
        case 'objectStop': {
          // a pending number closes before any trivia tokens are emitted
          if (openNumber) {
            if (streamNumbers) tokens.push(tokenEndNumber);
            openNumber = false;
            if (packNumbers) {
              tokens.push({name: 'numberValue', value: accumulator});
              accumulator = '';
            }
          }
          index = consumeTrivia(tokens, index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw new Error("Parser cannot parse input: expected ','");
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_COMMA) {
            expect = expect === 'arrayStop' ? 'value1' : 'key1';
            ++index;
            continue main;
          }
          if (cc === ASCII_CLOSE_BRACE || cc === ASCII_CLOSE_BRACKET) {
            if (cc === ASCII_CLOSE_BRACE ? expect === 'arrayStop' : expect !== 'arrayStop') {
              throw new Error("Parser cannot parse input: expected '" + (expect === 'arrayStop' ? ']' : '}') + "'");
            }
            tokens.push(cc === ASCII_CLOSE_BRACE ? tokenEndObject : tokenEndArray);
            parent = stack.pop();
            expect = expected[parent];
            ++index;
            continue main;
          }
          throw new Error("Parser cannot parse input: expected ','");
        }
        // number chunks — cross-chunk / fallback
        case 'numberStart': // [0-9]
          patterns.numberStart.lastIndex = index;
          match = patterns.numberStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw new Error('Parser cannot parse input: expected a starting digit');
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
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
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
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
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = 'numberFracDigit';
          index += value.length;
          break;
        case 'numberFracDigit': // [0-9]*
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
              expect = expected[parent];
              break;
            }
            break main; // wait for more input
          }
          value = match[0];
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
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
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
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
          if (streamNumbers) tokens.push({name: 'numberChunk', value});
          packNumbers && (accumulator += value);
          expect = 'numberExpDigit';
          index += value.length;
          break;
        case 'numberExpDigit': // [0-9]*
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
        case 'done': {
          // a pending number closes before any trivia tokens are emitted
          if (openNumber) {
            if (streamNumbers) tokens.push(tokenEndNumber);
            openNumber = false;
            if (packNumbers) {
              tokens.push({name: 'numberValue', value: accumulator});
              accumulator = '';
            }
          }
          index = consumeTrivia(tokens, index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) break main; // wait for more input / end
          if (jsonStreaming) {
            expect = 'value';
            continue main;
          }
          throw new Error('Parser cannot parse input: unexpected characters');
        }
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

const parser = options => gen(fixUtf8Stream(), jsoncParser(options));

parser.parser = parser;

export default parser;
export {parser, jsoncParser};
