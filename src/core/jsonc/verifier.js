// @ts-self-types="./verifier.d.ts"

// charCodeAt-based JSONC verifier. Same techniques as the JSON parser
// (src/core/parser.js): structural classification, whitespace skipping and
// comment detection use charCodeAt + integer compares instead of regex
// alternations; short strings, keys and numbers take a whole-lexeme fast path
// (one charCodeAt scan / one regex match). Escapes, long (>256) strings,
// literals (true/false/null) and any lexeme that abuts the buffer tail fall
// back to the incremental regex state machine below, preserving exact
// resumability and error positions. JSONC adds `//` / `/*` comments and
// trailing commas; this validates structure only (no tokens), keeping
// line/pos/offset (updatePos) byte-exact for error reporting.

import {flushable, gen, none} from 'stream-chain/core';

import fixUtf8Stream from 'stream-chain/utils/fixUtf8Stream.js';

const patterns = {
  string: /[^\x00-\x1f\"\\]{1,256}|\\[bfnrt\"\\/]|\\u[\da-fA-F]{4}|\"/y,
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

const eol = /[\u000A\u2028\u2029]|\u000D\u000A|\u000D/g;

const expected = {object: 'objectStop', array: 'arrayStop', '': 'done'};

// short escape codes accepted in a string: \b \f \n \r \t \" \\ \/
const codes = {b: 1, f: 1, n: 1, r: 1, t: 1, '"': 1, '\\': 1, '/': 1};

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

// char codes that legally terminate a number lexeme: , } ] and JSON whitespace
// (`/` is excluded so a number abutting a comment falls back to the incremental
// machine, where the stop state handles the comment)
const TERM = [];
for (const ch of ',}] \t\n\r') TERM[ch.charCodeAt(0)] = 1;
const numberFull = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?/y;
const HEX = c => (c >= ASCII_ZERO && c <= ASCII_NINE) || (c >= ASCII_UPPER_A && c <= ASCII_UPPER_F) || (c >= ASCII_LOWER_A && c <= ASCII_LOWER_F);

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

  // set by consumeTrivia when it stops on an incomplete comment and the caller
  // must wait for more input (break main, keeping the buffer from the returned
  // index — which points at the start of the incomplete comment)
  let triviaWait = false;

  const makeError = msg => {
    const error = /** @type {Error & {line: number, pos: number, offset: number}} */ (new Error('ERROR at ' + offset + ' (' + line + ', ' + pos + '): ' + msg));
    error.line = line;
    error.pos = pos;
    error.offset = offset;
    return error;
  };

  // advance line/pos/offset over a span that may contain line terminators
  // (whitespace runs, comments, string bodies with U+2028/U+2029)
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

  // validate a comment at index (buffer[index] === '/'), advancing position.
  // returns the index past the comment, or -1 to wait for more input.
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

  // Skip leading whitespace runs and comments, advancing position. Returns the
  // index of the first non-trivia character (or buffer.length if exhausted).
  // Sets triviaWait when it stops on an incomplete comment: the returned index
  // then points at that comment's start, so the caller breaks main and the
  // buffer keeps it. A `/` that is not the start of a comment (or a lone `/` at
  // EOF) is returned as a structural character for the caller to reject.
  const consumeTrivia = idx => {
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
      if (idx > wsStart) updatePos(buffer.slice(wsStart, idx));
      if (idx >= buffer.length) return idx; // exhausted — caller decides wait vs. done
      if (buffer.charCodeAt(idx) !== ASCII_SLASH) return idx; // structural character
      if (idx + 1 >= buffer.length) {
        if (done) return idx; // lone '/' at EOF — let the caller reject it
        triviaWait = true;
        return idx; // wait for the second comment character
      }
      const c2 = buffer.charCodeAt(idx + 1);
      if (c2 !== ASCII_SLASH && c2 !== ASCII_STAR) return idx; // not a comment — caller rejects
      const next = handleComment(idx);
      if (next === -1) {
        triviaWait = true;
        return idx; // incomplete comment body — wait, keeping it in the buffer
      }
      idx = next;
    }
  };

  const processBuffer = () => {
    let match,
      fm,
      e,
      q,
      cc,
      value,
      index = 0;
    main: for (;;) {
      switch (expect) {
        case 'value1':
        case 'value': {
          index = consumeTrivia(index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw makeError('Verifier has expected a value');
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_QUOTE) {
            // string: charCodeAt whole-string scan (validates escapes)
            q = index + 1;
            for (;;) {
              if (q >= buffer.length) {
                q = -1;
                break;
              }
              e = buffer.charCodeAt(q);
              if (e === ASCII_QUOTE) break;
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
                  q += 6;
                } else {
                  if (codes[buffer.charAt(q + 1)] === undefined) {
                    q = -1;
                    break;
                  }
                  q += 2;
                }
                continue;
              }
              ++q;
            }
            if (q >= 0) {
              updatePos(buffer.slice(index, q + 1));
              index = q + 1;
              expect = expected[parent];
              continue main;
            }
            // fall back to incremental string machine
            ++offset;
            ++pos;
            expect = 'string';
            ++index;
            continue main;
          }
          if (cc === ASCII_OPEN_BRACE) {
            stack.push(parent);
            parent = 'object';
            expect = 'key1';
            ++offset;
            ++pos;
            ++index;
            continue main;
          }
          if (cc === ASCII_OPEN_BRACKET) {
            stack.push(parent);
            parent = 'array';
            expect = 'value1';
            ++offset;
            ++pos;
            ++index;
            continue main;
          }
          if (cc === ASCII_CLOSE_BRACKET) {
            if (expect !== 'value1') throw makeError("Verifier cannot parse input: unexpected token ']'");
            parent = stack.pop();
            expect = expected[parent];
            ++offset;
            ++pos;
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
                offset += fm[0].length;
                pos += fm[0].length;
                index = e;
                expect = expected[parent];
                continue main;
              }
            }
            // fall back to incremental number machine
            ++offset;
            ++pos;
            ++index;
            if (cc === ASCII_MINUS) {
              expect = 'numberStart';
            } else if (cc === ASCII_ZERO) {
              expect = 'numberFraction';
            } else {
              expect = 'numberDigit';
            }
            continue main;
          }
          if (cc === ASCII_LOWER_T || cc === ASCII_LOWER_F || cc === ASCII_LOWER_N) {
            // true / false / null — regex for exact \b + wait semantics
            patterns.literal.lastIndex = index;
            match = patterns.literal.exec(buffer);
            if (!match) {
              if (done || index + MAX_PATTERN_SIZE < buffer.length) throw makeError('Verifier cannot parse input: expected a value');
              break main; // wait for more input
            }
            value = match[0];
            if (buffer.length - index === value.length && !done) break main; // wait for boundary
            offset += value.length;
            pos += value.length;
            index += value.length;
            expect = expected[parent];
            continue main;
          }
          throw makeError('Verifier cannot parse input: expected a value');
        }
        // incremental string body (escapes / long / cross-chunk)
        case 'keyVal':
        case 'string':
          patterns.string.lastIndex = index;
          match = patterns.string.exec(buffer);
          if (!match) {
            if (index < buffer.length && (done || buffer.length - index >= 6)) throw makeError('Verifier cannot parse input: escaped characters');
            if (done) throw makeError('Verifier has expected a string value');
            break main; // wait for more input
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
        case 'key': {
          index = consumeTrivia(index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw makeError('Verifier cannot parse input: expected an object key');
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_QUOTE) {
            // key string: charCodeAt whole-key scan (validates escapes)
            q = index + 1;
            for (;;) {
              if (q >= buffer.length) {
                q = -1;
                break;
              }
              e = buffer.charCodeAt(q);
              if (e === ASCII_QUOTE) break;
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
                  q += 6;
                } else {
                  if (codes[buffer.charAt(q + 1)] === undefined) {
                    q = -1;
                    break;
                  }
                  q += 2;
                }
                continue;
              }
              ++q;
            }
            if (q >= 0) {
              updatePos(buffer.slice(index, q + 1));
              index = q + 1;
              expect = 'colon';
              continue main;
            }
            ++offset;
            ++pos;
            expect = 'keyVal';
            ++index;
            continue main;
          }
          if (cc === ASCII_CLOSE_BRACE) {
            if (expect !== 'key1') throw makeError("Verifier cannot parse input: unexpected token '}'");
            parent = stack.pop();
            expect = expected[parent];
            ++offset;
            ++pos;
            ++index;
            continue main;
          }
          throw makeError('Verifier cannot parse input: expected an object key');
        }
        case 'colon': {
          index = consumeTrivia(index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw makeError("Verifier cannot parse input: expected ':'");
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_COLON) {
            expect = 'value';
            ++offset;
            ++pos;
            ++index;
            continue main;
          }
          throw makeError("Verifier cannot parse input: expected ':'");
        }
        case 'arrayStop':
        case 'objectStop': {
          index = consumeTrivia(index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) {
            if (done) throw makeError("Verifier cannot parse input: expected ','");
            break main; // wait for more input
          }
          cc = buffer.charCodeAt(index);
          if (cc === ASCII_COMMA) {
            expect = expect === 'arrayStop' ? 'value1' : 'key1';
            ++offset;
            ++pos;
            ++index;
            continue main;
          }
          if (cc === ASCII_CLOSE_BRACE || cc === ASCII_CLOSE_BRACKET) {
            if (cc === ASCII_CLOSE_BRACE ? expect === 'arrayStop' : expect !== 'arrayStop') {
              throw makeError("Verifier cannot parse input: expected '" + (expect === 'arrayStop' ? ']' : '}') + "'");
            }
            parent = stack.pop();
            expect = expected[parent];
            ++offset;
            ++pos;
            ++index;
            continue main;
          }
          throw makeError("Verifier cannot parse input: expected ','");
        }
        // number chunks — cross-chunk / fallback
        case 'numberStart': // [0-9]
          patterns.numberStart.lastIndex = index;
          match = patterns.numberStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected a starting digit');
            break main; // wait for more input
          }
          value = match[0];
          expect = value === '0' ? 'numberFraction' : 'numberDigit';
          updatePos(value);
          index += value.length;
          break;
        case 'numberDigit': // [0-9]*
          patterns.numberDigit.lastIndex = index;
          match = patterns.numberDigit.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected a digit');
            break main; // wait for more input
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
          expect = value === '.' ? 'numberFracStart' : 'numberExpSign';
          updatePos(value);
          index += value.length;
          break;
        case 'numberFracStart': // [0-9]
          patterns.numberFracStart.lastIndex = index;
          match = patterns.numberFracStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected a fractional part of a number');
            break main; // wait for more input
          }
          value = match[0];
          expect = 'numberFracDigit';
          updatePos(value);
          index += value.length;
          break;
        case 'numberFracDigit': // [0-9]*
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
          expect = 'numberExpSign';
          updatePos(value);
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
            if (done) throw makeError('Verifier has expected an exponent value of a number');
            break main; // wait for more input
          }
          value = match[0];
          expect = 'numberExpStart';
          updatePos(value);
          index += value.length;
          break;
        case 'numberExpStart': // [0-9]
          patterns.numberExpStart.lastIndex = index;
          match = patterns.numberExpStart.exec(buffer);
          if (!match) {
            if (index < buffer.length || done) throw makeError('Verifier cannot parse input: expected an exponent part of a number');
            break main; // wait for more input
          }
          value = match[0];
          expect = 'numberExpDigit';
          updatePos(value);
          index += value.length;
          break;
        case 'numberExpDigit': // [0-9]*
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
            break main; // wait for more input
          }
          break;
        case 'done': {
          index = consumeTrivia(index);
          if (triviaWait) break main; // wait for more input (incomplete comment)
          if (index >= buffer.length) break main; // wait for more input / end
          if (jsonStreaming) {
            expect = 'value';
            continue main;
          }
          throw makeError('Verifier cannot parse input: unexpected characters');
        }
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

jsoncVerifier.jsoncVerifier = jsoncVerifier;
jsoncVerifier.verifier = jsoncVerifier;

export default jsoncVerifier;
export {jsoncVerifier, jsoncVerifier as verifier};
