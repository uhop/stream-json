// Mirror of tests/node/test-jsonc-verifier.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import jsoncVerifier from '../../src/web/jsonc/verifier.js';

import {readWebString, drain} from '../web-helpers.js';

// === Valid JSONC inputs ===

test.asPromise('jsonc verifier (web): valid array', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[1,2,3]'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): valid array with newlines', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\n1,\n2,\n3\n]'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): valid array with CRLF', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\r\n1,\r\n2,\r\n3\r\n]'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): valid jsonStreaming', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('1 2 3'), jsoncVerifier({jsonStreaming: true})]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): exponent followed by EOF', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('1e2'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

// === Line comments ===

test.asPromise('jsonc verifier (web): line comment before value', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('// comment\n42'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): line comment inside array', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[1, // comment\n2]'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): line comment inside object', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"a": 1, // comment\n"b": 2}'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): line comment after colon', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"a": // comment\n1}'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): line comment after value', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('42 // trailing\n'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

// === Block comments ===

test.asPromise('jsonc verifier (web): block comment before value', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('/* comment */ 42'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): block comment inside array', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[1, /* comment */ 2]'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): multi-line block comment', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('/* line1\nline2\nline3 */ [1]'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): block comment after colon', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"a": /* comment */ 1}'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

// === Trailing commas ===

test.asPromise('jsonc verifier (web): trailing comma in array', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[1, 2, 3,]'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): trailing comma in object', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"a": 1, "b": 2,}'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): trailing comma with comment', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"a": 1, "b": 2, // trailing\n}'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): nested trailing commas', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"a": [1, 2,], "b": {"c": 3,},}'), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

// === Combined features ===

test.asPromise('jsonc verifier (web): comments + trailing commas + nesting', async (t, resolve, reject) => {
  try {
    const input = `{
    // top-level comment
    "name": "test", /* inline */
    "items": [
      1,
      2, // trailing
    ],
  }`;
    const pipeline = chain([readWebString(input), jsoncVerifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): jsonStreaming with comments', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('1 // comment\n 2 /* block */ 3'), jsoncVerifier({jsonStreaming: true})]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

// === Error cases ===

test.asPromise('jsonc verifier (web): error position - missing comma', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[1,2 3]'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (error) {
      t.equal(error.line, 1);
      t.equal(error.pos, 6);
      t.equal(error.offset, 5);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error position - missing comma with newlines', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\n1,\n2\n3\n]'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (error) {
      t.equal(error.line, 4);
      t.equal(error.pos, 1);
      t.equal(error.offset, 7);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error position - missing comma with CRLF', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\r\n1,\r\n2\r\n3\r\n]'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (error) {
      t.equal(error.line, 4);
      t.equal(error.pos, 1);
      t.equal(error.offset, 10);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error - comma in jsonStreaming', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('1 , 3'), jsoncVerifier({jsonStreaming: true})]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (error) {
      t.equal(error.line, 1);
      t.equal(error.pos, 3);
      t.equal(error.offset, 2);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error - mismatched bracket', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"x":1]'), jsoncVerifier({jsonStreaming: true})]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (error) {
      t.equal(error.line, 1);
      t.equal(error.pos, 7);
      t.equal(error.offset, 6);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error - unterminated block comment', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('/* unterminated'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error - zero byte in string', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('"a\x00a"'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error - newline in string', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('"a\na"'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error - tab in string', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('"a\ta"'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): infinite fail', async (t, resolve, reject) => {
  try {
    const sample = '{"key1":1}garbage{"key3":2}';
    let pulls = 0;
    const infinite = new ReadableStream({
      pull(controller) {
        if (++pulls > 1000) {
          controller.close();
          return;
        }
        controller.enqueue(sample);
      }
    });
    const pipeline = chain([infinite, jsoncVerifier({jsonStreaming: true})]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

// === Error position with comments ===

test.asPromise('jsonc verifier (web): error position after line comment', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('// comment\n[1 2]'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (error) {
      t.equal(error.line, 2);
      t.equal(error.pos, 4);
      t.equal(error.offset, 14);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonc verifier (web): error position after block comment', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('/* c */ [1 2]'), jsoncVerifier()]);
    try {
      await drain(pipeline);
      t.fail("We shouldn't be here.");
      return reject();
    } catch (error) {
      t.equal(error.line, 1);
      t.equal(error.pos, 12);
      t.equal(error.offset, 11);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});
