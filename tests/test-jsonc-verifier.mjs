import {Readable} from 'node:stream';

import test from 'tape-six';

import jsoncVerifier from '../src/jsonc/verifier.js';

import readString from './read-string.mjs';

// === Valid JSONC inputs ===

test.asPromise('jsonc verifier: valid array', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[1,2,3]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: valid array with newlines', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[\n1,\n2,\n3\n]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: valid array with CRLF', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[\r\n1,\r\n2,\r\n3\r\n]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: valid jsonStreaming', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream({jsonStreaming: true}),
    pipeline = readString('1 2 3').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: exponent followed by EOF', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('1e2').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

// === Line comments ===

test.asPromise('jsonc verifier: line comment before value', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('// comment\n42').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: line comment inside array', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[1, // comment\n2]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: line comment inside object', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('{"a": 1, // comment\n"b": 2}').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: line comment after colon', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('{"a": // comment\n1}').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: line comment after value', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('42 // trailing\n').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

// === Block comments ===

test.asPromise('jsonc verifier: block comment before value', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('/* comment */ 42').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: block comment inside array', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[1, /* comment */ 2]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: multi-line block comment', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('/* line1\nline2\nline3 */ [1]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: block comment after colon', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('{"a": /* comment */ 1}').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

// === Trailing commas ===

test.asPromise('jsonc verifier: trailing comma in array', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[1, 2, 3,]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: trailing comma in object', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('{"a": 1, "b": 2,}').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: trailing comma with comment', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('{"a": 1, "b": 2, // trailing\n}').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: nested trailing commas', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('{"a": [1, 2,], "b": {"c": 3,},}').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

// === Combined features ===

test.asPromise('jsonc verifier: comments + trailing commas + nesting', (t, resolve, reject) => {
  const input = `{
    // top-level comment
    "name": "test", /* inline */
    "items": [
      1,
      2, // trailing
    ],
  }`;
  const stream = jsoncVerifier.asStream(),
    pipeline = readString(input).pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('jsonc verifier: jsonStreaming with comments', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream({jsonStreaming: true}),
    pipeline = readString('1 // comment\n 2 /* block */ 3').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

// === Error cases ===

test.asPromise('jsonc verifier: error position - missing comma', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[1,2 3]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 1);
    t.equal(error.pos, 6);
    t.equal(error.offset, 5);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error position - missing comma with newlines', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[\n1,\n2\n3\n]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 4);
    t.equal(error.pos, 1);
    t.equal(error.offset, 7);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error position - missing comma with CRLF', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('[\r\n1,\r\n2\r\n3\r\n]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 4);
    t.equal(error.pos, 1);
    t.equal(error.offset, 10);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error - comma in jsonStreaming', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream({jsonStreaming: true}),
    pipeline = readString('1 , 3').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 1);
    t.equal(error.pos, 3);
    t.equal(error.offset, 2);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error - mismatched bracket', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream({jsonStreaming: true}),
    pipeline = readString('{"x":1]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 1);
    t.equal(error.pos, 7);
    t.equal(error.offset, 6);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error - unterminated block comment', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('/* unterminated').pipe(stream);

  pipeline.on('error', () => resolve());
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error - zero byte in string', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('"a\x00a"').pipe(stream);

  pipeline.on('error', () => resolve());
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error - newline in string', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('"a\na"').pipe(stream);

  pipeline.on('error', () => resolve());
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error - tab in string', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('"a\ta"').pipe(stream);

  pipeline.on('error', () => resolve());
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: infinite fail', (t, resolve, reject) => {
  const sample = '{"key1":1}garbage{"key3":2}',
    stream = jsoncVerifier.asStream({jsonStreaming: true});

  stream.on('error', () => resolve());
  stream.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });

  Readable.from(
    (function* () {
      while (true) yield sample;
    })()
  ).pipe(stream);
});

// === Error position with comments ===

test.asPromise('jsonc verifier: error position after line comment', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('// comment\n[1 2]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 2);
    t.equal(error.pos, 4);
    t.equal(error.offset, 14);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('jsonc verifier: error position after block comment', (t, resolve, reject) => {
  const stream = jsoncVerifier.asStream(),
    pipeline = readString('/* c */ [1 2]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 1);
    t.equal(error.pos, 12);
    t.equal(error.offset, 11);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});
