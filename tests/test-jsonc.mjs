import test from 'tape-six';
import chain from 'stream-chain';

import jsoncParser from '../src/jsonc/parser.js';
import jsoncStringer from '../src/jsonc/stringer.js';
import {streamArray} from '../src/streamers/stream-array.js';
import {pick} from '../src/filters/pick.js';

import readString from './read-string.mjs';

// helpers

const parse = (input, options, quant) =>
  new Promise((resolve, reject) => {
    const result = [];
    const pipeline = chain([readString(input, quant), jsoncParser(options)]);
    pipeline.on('data', chunk => result.push(chunk));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(result));
  });

const structural = tokens => tokens.filter(t => t.name !== 'whitespace' && t.name !== 'comment');

const roundTrip = (input, options, quant) =>
  new Promise((resolve, reject) => {
    let result = '';
    const pipeline = chain([readString(input, quant), jsoncParser(options), jsoncStringer()]);
    pipeline.on('data', chunk => (result += chunk));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(result));
  });

// JSON compatibility

test.asPromise('jsonc parser: standard JSON object', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"]}';
  const pipeline = chain([readString(input), jsoncParser()]);
  const result = [];

  pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    t.equal(s[1].name, 'startKey');
    t.equal(s[2].name, 'stringChunk');
    t.equal(s[2].val, 'a');
    t.equal(s[3].name, 'endKey');
    t.equal(s[4].name, 'keyValue');
    t.equal(s[4].val, 'a');
    t.equal(s[s.length - 1].name, 'endObject');
    resolve();
  });
});

test.asPromise('jsonc parser: standard JSON array', (t, resolve, reject) => {
  const input = '[1, 2, 3]';
  const pipeline = chain([readString(input), jsoncParser()]);
  const result = [];

  pipeline.on('data', chunk => result.push(chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const s = structural(result);
    t.equal(s[0].name, 'startArray');
    t.equal(s[s.length - 1].name, 'endArray');
    const nums = s.filter(t => t.name === 'numberValue');
    t.deepEqual(
      nums.map(n => n.value),
      ['1', '2', '3']
    );
    resolve();
  });
});

// Whitespace tokens

test.asPromise('jsonc parser: whitespace tokens', (t, resolve, reject) => {
  const input = '{ "a" : 1 }';
  parse(input).then(result => {
    const ws = result.filter(t => t.name === 'whitespace');
    t.ok(ws.length > 0, 'should emit whitespace tokens');
    ws.forEach(w => t.ok(w.value.trim() === '', 'whitespace value should be whitespace chars'));
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: streamWhitespace false', (t, resolve, reject) => {
  const input = '{ "a" : 1 }';
  parse(input, {streamWhitespace: false}).then(result => {
    const ws = result.filter(t => t.name === 'whitespace');
    t.equal(ws.length, 0, 'should not emit whitespace tokens');
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    resolve();
  }, reject);
});

// Single-line comments

test.asPromise('jsonc parser: single-line comment', (t, resolve, reject) => {
  const input = '{\n// this is a comment\n"a": 1\n}';
  parse(input).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '// this is a comment\n');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: single-line comment at EOF without newline', (t, resolve, reject) => {
  const input = '1 // end';
  parse(input).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '// end');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: single-line comment with \\r\\n', (t, resolve, reject) => {
  const input = '{\r\n// comment\r\n"a": 1\r\n}';
  parse(input).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '// comment\r\n');
    resolve();
  }, reject);
});

// Multi-line comments

test.asPromise('jsonc parser: multi-line comment', (t, resolve, reject) => {
  const input = '{"a": /* inline */ 1}';
  parse(input).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 1);
    t.equal(comments[0].value, '/* inline */');
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: multi-line comment spanning lines', (t, resolve, reject) => {
  const input = '{\n/*\n  multi\n  line\n*/\n"a": 1\n}';
  parse(input).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 1);
    t.ok(comments[0].value.startsWith('/*'));
    t.ok(comments[0].value.endsWith('*/'));
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: unterminated block comment', (t, resolve, reject) => {
  const input = '{"a": /* unterminated 1}';
  parse(input).then(
    () => {
      t.fail('should have thrown');
      resolve();
    },
    err => {
      t.ok(err.message.includes('unterminated block comment'));
      resolve();
    }
  );
});

// streamComments option

test.asPromise('jsonc parser: streamComments false', (t, resolve, reject) => {
  const input = '{\n// comment\n"a": 1\n}';
  parse(input, {streamComments: false}).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 0, 'should not emit comment tokens');
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    resolve();
  }, reject);
});

// Trailing commas

test.asPromise('jsonc parser: trailing comma in array', (t, resolve, reject) => {
  const input = '[1, 2, 3,]';
  parse(input).then(result => {
    const s = structural(result);
    const nums = s.filter(t => t.name === 'numberValue');
    t.deepEqual(
      nums.map(n => n.value),
      ['1', '2', '3']
    );
    t.equal(s[0].name, 'startArray');
    t.equal(s[s.length - 1].name, 'endArray');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: trailing comma in object', (t, resolve, reject) => {
  const input = '{"a": 1, "b": 2,}';
  parse(input).then(result => {
    const s = structural(result);
    const keys = s.filter(t => t.name === 'keyValue');
    t.deepEqual(
      keys.map(k => k.value),
      ['a', 'b']
    );
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: nested trailing commas', (t, resolve, reject) => {
  const input = '{"a": [1, 2,], "b": {"c": 3,},}';
  parse(input).then(result => {
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    t.equal(s[s.length - 1].name, 'endObject');
    resolve();
  }, reject);
});

// Edge cases

test.asPromise('jsonc parser: comment-like in string', (t, resolve, reject) => {
  const input = '{"a": "// not a comment", "b": "/* also not */"}';
  parse(input).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 0, 'comment-like sequences in strings are not comments');
    const strings = result.filter(t => t.name === 'stringValue');
    t.ok(strings.some(s => s.value === '// not a comment'));
    t.ok(strings.some(s => s.value === '/* also not */'));
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: chunked input', (t, resolve, reject) => {
  const input = '{\n// comment\n"a": /* inline */ 1\n}';
  parse(input, undefined, 3).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 2);
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    t.equal(s[s.length - 1].name, 'endObject');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: empty input with comments only', (t, resolve, reject) => {
  const input = '// just a comment\nnull';
  parse(input).then(result => {
    const comments = result.filter(t => t.name === 'comment');
    t.equal(comments.length, 1);
    const s = structural(result);
    t.equal(s[0].name, 'nullValue');
    resolve();
  }, reject);
});

// Stringer

test.asPromise('jsonc stringer: standard JSON', (t, resolve, reject) => {
  roundTrip('{"a":1,"b":true}').then(result => {
    t.equal(result, '{"a":1,"b":true}');
    resolve();
  }, reject);
});

test.asPromise('jsonc stringer: preserves comments', (t, resolve, reject) => {
  const input = '{"a":1,// line comment\n"b":2}';
  roundTrip(input).then(result => {
    t.ok(result.includes('// line comment\n'));
    resolve();
  }, reject);
});

test.asPromise('jsonc stringer: preserves block comments', (t, resolve, reject) => {
  const input = '{"a":/* comment */1}';
  roundTrip(input).then(result => {
    t.ok(result.includes('/* comment */'));
    resolve();
  }, reject);
});

test.asPromise('jsonc stringer: preserves whitespace', (t, resolve, reject) => {
  const input = '{\n  "a": 1\n}';
  roundTrip(input, {streamWhitespace: false}).then(result => {
    t.equal(result, '{"a":1}');
    resolve();
  }, reject);
});

// Downstream compatibility

test.asPromise('jsonc parser: works with streamArray', (t, resolve, reject) => {
  const input = '[1, /* comment */ 2, 3]';
  const pipeline = chain([readString(input), jsoncParser(), streamArray()]);
  const result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [1, 2, 3]);
    resolve();
  });
});

test.asPromise('jsonc parser: works with pick filter', (t, resolve, reject) => {
  const input = '{\n// comment\n"data": [1, 2],\n"other": 3\n}';
  const pipeline = chain([readString(input), jsoncParser(), pick({filter: 'data'})]);
  const result = [];

  pipeline.on('data', chunk => result.push(chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const s = structural(result);
    t.ok(s.some(t => t.name === 'startArray'));
    t.ok(s.some(t => t.name === 'endArray'));
    resolve();
  });
});

// asStream

test.asPromise('jsonc parser: asStream', (t, resolve, reject) => {
  const input = '{"a": 1}';
  const result = [];
  const pipeline = readString(input).pipe(jsoncParser.asStream());

  pipeline.on('data', chunk => result.push(chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const s = structural(result);
    t.equal(s[0].name, 'startObject');
    t.equal(s[s.length - 1].name, 'endObject');
    resolve();
  });
});

test.asPromise('jsonc stringer: asStream', (t, resolve, reject) => {
  let result = '';
  const pipeline = chain([readString('{"a":1}'), jsoncParser()]);
  const stringer = jsoncStringer.asStream();
  pipeline.pipe(stringer);

  stringer.on('data', chunk => (result += chunk));
  stringer.on('error', reject);
  stringer.on('end', () => {
    t.equal(result, '{"a":1}');
    resolve();
  });
});
