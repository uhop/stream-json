import test from 'tape-six';
import chain from 'stream-chain';
import {none} from 'stream-chain/core';

import jsoncParser from '../../src/jsonc/parser.js';
import jsoncStringer from '../../src/jsonc/stringer.js';
import Assembler from '../../src/assembler.js';
import {streamArray} from '../../src/streamers/stream-array.js';
import {pick} from '../../src/filters/pick.js';

import {readString} from '../helpers.js';

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

// Comma tokens (streamCommas parser option + useCommas stringer option)

// round-trip that surfaces commas as tokens and renders them back verbatim
const rtCommas = (input, quant) =>
  new Promise((resolve, reject) => {
    let result = '';
    const pipeline = chain([readString(input, quant), jsoncParser({streamCommas: true}), jsoncStringer({useCommas: true})]);
    pipeline.on('data', chunk => (result += chunk));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(result));
  });

test.asPromise('jsonc parser: streamCommas off (default) emits no comma tokens', (t, resolve, reject) => {
  parse('[1, 2, 3,]').then(result => {
    t.equal(result.filter(tok => tok.name === 'comma').length, 0, 'no comma tokens by default');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: streamCommas emits a valueless comma token per separator', (t, resolve, reject) => {
  parse('[1, 2, 3]', {streamCommas: true}).then(result => {
    const commas = result.filter(tok => tok.name === 'comma');
    t.equal(commas.length, 2, 'two separator commas');
    t.equal(commas[0].value, undefined, 'comma token carries no value');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: streamCommas counts trailing commas too', (t, resolve, reject) => {
  parse('[1, 2, 3,]', {streamCommas: true}).then(result => {
    t.equal(result.filter(tok => tok.name === 'comma').length, 3, 'two separators + one trailing');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: streamCommas counts commas at every nesting level', (t, resolve, reject) => {
  parse('{"a": [1, 2,], "b": {"c": 3,},}', {streamCommas: true}).then(result => {
    t.equal(result.filter(tok => tok.name === 'comma').length, 5, 'all separator + trailing commas, every level');
    resolve();
  }, reject);
});

test.asPromise('jsonc parser: comma tokens are ignored downstream (assembler)', (t, resolve, reject) => {
  const pipeline = chain([readString('[1, 2, 3,]'), jsoncParser({streamCommas: true}), streamArray()]);
  const result = [];
  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [1, 2, 3], 'comma tokens do not disturb value assembly');
    resolve();
  });
});

// Byte-faithful round-trip (the streaming-edit use case) — including the cases
// the auto-insert stringer alone reorders: separators followed by whitespace

const faithfulRoundTrips = [
  '[1, 2, 3]',
  '[\n  1,\n  2,\n  3\n]',
  '[\n  1,\n  2,\n]',
  '[1, 2, 3,]',
  '{"a": 1, "b": 2,}',
  '{"a":[1,2,],"b":{"c":3,},}',
  '[1, /* c */ 2]',
  '{\n  // x\n  "a": 1,\n}'
];

faithfulRoundTrips.forEach(input =>
  test.asPromise('jsonc round-trip streamCommas+useCommas: ' + JSON.stringify(input), (t, resolve, reject) => {
    rtCommas(input).then(result => {
      t.equal(result, input, 'byte-faithful round-trip preserves commas and trivia in order');
      resolve();
    }, reject);
  })
);

// resumability: commas, trivia, and closes may straddle chunk boundaries — the
// comma byte is buffered when seen, so no lookahead/wait is involved
['[1,\n/* c */]', '[\n  1,\n  2,\n]', '{"a": 1, "b": 2,}'].forEach(input =>
  [1, 2, 3, 5].forEach(quant =>
    test.asPromise('jsonc round-trip streamCommas chunked ' + JSON.stringify(input) + ' (quant=' + quant + ')', (t, resolve, reject) => {
      rtCommas(input, quant).then(result => {
        t.equal(result, input, 'byte-faithful across chunk boundaries');
        resolve();
      }, reject);
    })
  )
);

// useCommas auto-insert fallback: output stays valid even if comma tokens were
// lost upstream (the stringer inserts a separator when no comma token preceded
// the value)

test.asPromise('jsonc stringer: useCommas auto-inserts when no comma token arrives', (t, resolve, reject) => {
  // stream has no comma tokens (parser streamCommas off) but useCommas is on
  let result = '';
  const pipeline = chain([readString('[1,2,3]'), jsoncParser(), jsoncStringer({useCommas: true})]);
  pipeline.on('data', chunk => (result += chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result, '[1,2,3]', 'separators auto-inserted -> valid output');
    resolve();
  });
});

test.asPromise('jsonc stringer: useCommas survives a comma token dropped mid-stream', (t, resolve, reject) => {
  let dropped = false;
  let result = '';
  const pipeline = chain([
    readString('[1,2,3]'),
    jsoncParser({streamCommas: true}),
    tok => (tok.name === 'comma' && !dropped ? ((dropped = true), none) : tok), // simulate an upstream step losing a comma
    jsoncStringer({useCommas: true})
  ]);
  pipeline.on('data', chunk => (result += chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result, '[1,2,3]', 'missing comma auto-inserted -> still valid');
    resolve();
  });
});

test.asPromise('jsonc stringer: useCommas off drops stray comma tokens (no double commas)', (t, resolve, reject) => {
  // parser emits comma tokens, but the stringer is in default auto-insert mode
  let result = '';
  const pipeline = chain([readString('[1,2,3]'), jsoncParser({streamCommas: true}), jsoncStringer()]);
  pipeline.on('data', chunk => (result += chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result, '[1,2,3]', 'comma tokens dropped; auto-insert governs');
    resolve();
  });
});

test.asPromise('jsonc round-trip: streamCommas off + default stringer is unchanged', (t, resolve, reject) => {
  roundTrip('[1,2,3,]').then(result => {
    t.equal(result, '[1,2,3]', 'no comma tokens; trailing comma dropped, separators auto-inserted');
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

// Sliding window

const runSlidingWindowTest = quant => (t, resolve, reject) => {
  const input = '{\n  // line comment\n  "a": 1,\n  "b": /* inline */ true,\n  "c": ["d", 2,],\n}';
  const expected = {a: 1, b: true, c: ['d', 2]};
  const pipeline = readString(input, quant).pipe(jsoncParser.asStream());
  const assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, expected);
    resolve();
  });
};

test.asPromise('jsonc parser: sliding window - 1', runSlidingWindowTest(1));
test.asPromise('jsonc parser: sliding window - 2', runSlidingWindowTest(2));
test.asPromise('jsonc parser: sliding window - 3', runSlidingWindowTest(3));
test.asPromise('jsonc parser: sliding window - 4', runSlidingWindowTest(4));
test.asPromise('jsonc parser: sliding window - 5', runSlidingWindowTest(5));
test.asPromise('jsonc parser: sliding window - 6', runSlidingWindowTest(6));
test.asPromise('jsonc parser: sliding window - 7', runSlidingWindowTest(7));
test.asPromise('jsonc parser: sliding window - 8', runSlidingWindowTest(8));
test.asPromise('jsonc parser: sliding window - 9', runSlidingWindowTest(9));
test.asPromise('jsonc parser: sliding window - 10', runSlidingWindowTest(10));
test.asPromise('jsonc parser: sliding window - 11', runSlidingWindowTest(11));
test.asPromise('jsonc parser: sliding window - 12', runSlidingWindowTest(12));
test.asPromise('jsonc parser: sliding window - 13', runSlidingWindowTest(13));

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
