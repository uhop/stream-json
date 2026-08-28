// Mirror of the jsonc parser scenarios from tests/node/test-jsonc.js.
// See tests/web/test-stringer.js for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import jsoncParser from '../../src/web/jsonc/parser.js';
import Assembler from '../../src/web/assembler.js';
import streamArray from '../../src/web/streamers/stream-array.js';
import pick from '../../src/web/filters/pick.js';

import {readWebString, drain} from '../web-helpers.js';

// helpers

const parse = async (input, options, quant) => {
  const pipeline = chain([readWebString(input, quant), jsoncParser(options)]);
  return drain(pipeline);
};

const trivia = {whitespace: 1, startComment: 1, commentChunk: 1, endComment: 1, commentValue: 1};
const structural = tokens => tokens.filter(t => trivia[t.name] !== 1);

// JSON compatibility

test.asPromise('jsonc parser (web): standard JSON object', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const result = await parse(input);
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    t.equal(s[1].name, 'startKey');
    t.equal(s[2].name, 'stringChunk');
    t.equal(s[2].value, 'a');
    t.equal(s[3].name, 'endKey');
    t.equal(s[4].name, 'keyValue');
    t.equal(s[4].value, 'a');
    t.equal(s[s.length - 1].name, 'endObject');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): standard JSON array', async (t, resolve, reject) => {
  try {
    const input = '[1, 2, 3]';
    const result = await parse(input);
    const s = structural(result);
    t.equal(s[0].name, 'startArray');
    t.equal(s[s.length - 1].name, 'endArray');
    const nums = s.filter(t => t.name === 'numberValue');
    t.deepEqual(
      nums.map(n => n.value),
      ['1', '2', '3']
    );
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Whitespace tokens

test.asPromise('jsonc parser (web): whitespace tokens', async (t, resolve, reject) => {
  try {
    const input = '{ "a" : 1 }';
    const result = await parse(input);
    const ws = result.filter(t => t.name === 'whitespace');
    t.ok(ws.length > 0);
    ws.forEach(w => t.ok(w.value.trim() === ''));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): streamWhitespace false', async (t, resolve, reject) => {
  try {
    const input = '{ "a" : 1 }';
    const result = await parse(input, {streamWhitespace: false});
    const ws = result.filter(t => t.name === 'whitespace');
    t.equal(ws.length, 0);
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Single-line comments

test.asPromise('jsonc parser (web): single-line comment', async (t, resolve, reject) => {
  try {
    const input = '{\n// this is a comment\n"a": 1\n}';
    const result = await parse(input);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '// this is a comment\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): single-line comment at EOF without newline', async (t, resolve, reject) => {
  try {
    const input = '1 // end';
    const result = await parse(input);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '// end');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): single-line comment with \\r\\n', async (t, resolve, reject) => {
  try {
    const input = '{\r\n// comment\r\n"a": 1\r\n}';
    const result = await parse(input);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '// comment\r\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Multi-line comments

test.asPromise('jsonc parser (web): multi-line comment', async (t, resolve, reject) => {
  try {
    const input = '{"a": /* inline */ 1}';
    const result = await parse(input);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '/* inline */');
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): multi-line comment spanning lines', async (t, resolve, reject) => {
  try {
    const input = '{\n/*\n  multi\n  line\n*/\n"a": 1\n}';
    const result = await parse(input);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 1);
    t.ok(comments[0].value.startsWith('/*'));
    t.ok(comments[0].value.endsWith('*/'));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): unterminated block comment', async (t, resolve, reject) => {
  try {
    const input = '{"a": /* unterminated 1}';
    try {
      await parse(input);
      t.fail('should have thrown');
      return reject();
    } catch (err) {
      t.ok(err.message.includes('unterminated block comment'));
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

// streamComments option

test.asPromise('jsonc parser (web): streamComments false', async (t, resolve, reject) => {
  try {
    const input = '{\n// comment\n"a": 1\n}';
    const result = await parse(input, {streamComments: false, packComments: false});
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 0);
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Trailing commas

test.asPromise('jsonc parser (web): trailing comma in array', async (t, resolve, reject) => {
  try {
    const input = '[1, 2, 3,]';
    const result = await parse(input);
    const s = structural(result);
    const nums = s.filter(t => t.name === 'numberValue');
    t.deepEqual(
      nums.map(n => n.value),
      ['1', '2', '3']
    );
    t.equal(s[0].name, 'startArray');
    t.equal(s[s.length - 1].name, 'endArray');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): trailing comma in object', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": 2,}';
    const result = await parse(input);
    const s = structural(result);
    const keys = s.filter(t => t.name === 'keyValue');
    t.deepEqual(
      keys.map(k => k.value),
      ['a', 'b']
    );
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): nested trailing commas', async (t, resolve, reject) => {
  try {
    const input = '{"a": [1, 2,], "b": {"c": 3,},}';
    const result = await parse(input);
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    t.equal(s[s.length - 1].name, 'endObject');
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Edge cases

test.asPromise('jsonc parser (web): comment-like in string', async (t, resolve, reject) => {
  try {
    const input = '{"a": "// not a comment", "b": "/* also not */"}';
    const result = await parse(input);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 0);
    const strings = result.filter(t => t.name === 'stringValue');
    t.ok(strings.some(s => s.value === '// not a comment'));
    t.ok(strings.some(s => s.value === '/* also not */'));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): chunked input', async (t, resolve, reject) => {
  try {
    const input = '{\n// comment\n"a": /* inline */ 1\n}';
    const result = await parse(input, undefined, 3);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 2);
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    t.equal(s[s.length - 1].name, 'endObject');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): empty input with comments only', async (t, resolve, reject) => {
  try {
    const input = '// just a comment\nnull';
    const result = await parse(input);
    const comments = result.filter(t => t.name === 'commentValue');
    t.equal(comments.length, 1);
    const s = structural(result);
    t.equal(s[0].name, 'nullValue');
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Downstream compatibility

test.asPromise('jsonc parser (web): works with streamArray', async (t, resolve, reject) => {
  try {
    const input = '[1, /* comment */ 2, 3]';
    const pipeline = chain([readWebString(input), jsoncParser(), streamArray()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, [1, 2, 3]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc parser (web): works with pick filter', async (t, resolve, reject) => {
  try {
    const input = '{\n// comment\n"data": [1, 2],\n"other": 3\n}';
    const pipeline = chain([readWebString(input), jsoncParser(), pick({filter: 'data'})]);
    const result = await drain(pipeline);
    const s = structural(result);
    t.ok(s.some(t => t.name === 'startArray'));
    t.ok(s.some(t => t.name === 'endArray'));
    resolve();
  } catch (e) {
    reject(e);
  }
});

// Sliding window

const runSlidingWindowTest = quant => async (t, resolve, reject) => {
  try {
    const input = '{\n  // line comment\n  "a": 1,\n  "b": /* inline */ true,\n  "c": ["d", 2,],\n}';
    const expected = {a: 1, b: true, c: ['d', 2]};
    const pipeline = chain([readWebString(input, quant), jsoncParser()]);
    const asm = Assembler.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, expected);
    resolve();
  } catch (e) {
    reject(e);
  }
};

test.asPromise('jsonc parser (web): sliding window - 1', runSlidingWindowTest(1));
test.asPromise('jsonc parser (web): sliding window - 2', runSlidingWindowTest(2));
test.asPromise('jsonc parser (web): sliding window - 3', runSlidingWindowTest(3));
test.asPromise('jsonc parser (web): sliding window - 4', runSlidingWindowTest(4));
test.asPromise('jsonc parser (web): sliding window - 5', runSlidingWindowTest(5));
test.asPromise('jsonc parser (web): sliding window - 6', runSlidingWindowTest(6));
test.asPromise('jsonc parser (web): sliding window - 7', runSlidingWindowTest(7));
test.asPromise('jsonc parser (web): sliding window - 8', runSlidingWindowTest(8));
test.asPromise('jsonc parser (web): sliding window - 9', runSlidingWindowTest(9));
test.asPromise('jsonc parser (web): sliding window - 10', runSlidingWindowTest(10));
test.asPromise('jsonc parser (web): sliding window - 11', runSlidingWindowTest(11));
test.asPromise('jsonc parser (web): sliding window - 12', runSlidingWindowTest(12));
test.asPromise('jsonc parser (web): sliding window - 13', runSlidingWindowTest(13));

// comments mirror chunked strings: streamed startComment / commentChunk / endComment, packed commentValue

const commentTokens = tokens => tokens.filter(t => trivia[t.name] === 1 && t.name !== 'whitespace');

test.asPromise('jsonc parser (web): comment forms mirror strings', async (t, resolve, reject) => {
  try {
    const input = '{/* block */"a": 1 // line\n}';
    const both = commentTokens(await parse(input));
    t.deepEqual(
      both.map(x => x.name),
      ['startComment', 'commentChunk', 'endComment', 'commentValue', 'startComment', 'commentChunk', 'endComment', 'commentValue']
    );
    t.equal(both[3].value, '/* block */');
    t.equal(both[7].value, '// line\n');
    t.deepEqual(
      commentTokens(await parse(input, {streamComments: false})).map(x => x.name),
      ['commentValue', 'commentValue']
    );
    t.deepEqual(
      commentTokens(await parse(input, {packComments: false})).map(x => x.name),
      ['startComment', 'commentChunk', 'endComment', 'startComment', 'commentChunk', 'endComment']
    );
    resolve();
  } catch (e) {
    reject(e);
  }
});

['{/* block\ncomment */"a": 1}', '{"a": 1 // line\r\n}', '[/**/ 1, /*/ x */ 2] // tail', '// a\r\n// b\n[1]'].forEach(input =>
  [1, 2, 3, 5].forEach(quant =>
    test.asPromise('jsonc parser (web): comments chunked ' + JSON.stringify(input) + ' (quant=' + quant + ')', async (t, resolve, reject) => {
      try {
        const whole = await parse(input),
          chunked = await parse(input, undefined, quant);
        t.deepEqual(structural(chunked), structural(whole), 'structural tokens unchanged');
        const values = chunked.filter(x => x.name === 'commentValue').map(x => x.value);
        t.deepEqual(
          values,
          whole.filter(x => x.name === 'commentValue').map(x => x.value),
          'packed comments unchanged'
        );
        const joined = [];
        let current = null;
        for (const x of chunked) {
          if (x.name === 'startComment') current = '';
          else if (x.name === 'commentChunk') current += x.value;
          else if (x.name === 'endComment') {
            joined.push(current);
            current = null;
          }
        }
        t.deepEqual(joined, values, 'chunks concatenate to the packed value');
        resolve();
      } catch (e) {
        reject(e);
      }
    })
  )
);
