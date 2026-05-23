// Mirror of tests/node/test-verifier.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import verifier from '../../src/web/utils/verifier.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('verifier (web): valid array', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[1,2,3]'), verifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('verifier (web): valid array with newlines', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\n1,\n2,\n3\n]'), verifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('verifier (web): valid array with CRLF', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\r\n1,\r\n2,\r\n3\r\n]'), verifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('verifier (web): valid jsonStreaming', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('1 2 3'), verifier({jsonStreaming: true})]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('verifier (web): error position - missing comma', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[1,2 3]'), verifier()]);
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

test.asPromise('verifier (web): error position - missing comma with newlines', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\n1,\n2\n3\n]'), verifier()]);
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

test.asPromise('verifier (web): error position - missing comma with CRLF', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('[\r\n1,\r\n2\r\n3\r\n]'), verifier()]);
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

test.asPromise('verifier (web): error - comma in jsonStreaming', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('1 , 3'), verifier({jsonStreaming: true})]);
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

test.asPromise('verifier (web): error - mismatched bracket', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"x":1]'), verifier({jsonStreaming: true})]);
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

test.asPromise('verifier (web): infinite fail', async (t, resolve, reject) => {
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
    const pipeline = chain([infinite, verifier({jsonStreaming: true})]);
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

test.asPromise('verifier (web): issue #167 - zero byte', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('"a\x00a"'), verifier()]);
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

test.asPromise('verifier (web): issue #167 - newline in string', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('"a\na"'), verifier()]);
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

test.asPromise('verifier (web): issue #167 - tab in string', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('"a\ta"'), verifier()]);
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

test.asPromise('verifier (web): exponent followed by EOF', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('1e2'), verifier()]);
    await drain(pipeline);
    t.ok(true);
    resolve();
  } catch (e) {
    reject(e);
  }
});
