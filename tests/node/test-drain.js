import {test} from 'tape-six';

import drain from '../../src/utils/drain.js';

test.asPromise('drain: empty async iterable resolves to undefined', async (t, resolve) => {
  async function* gen() {}
  const result = await drain(gen());
  t.equal(result, undefined);
  resolve();
});

test.asPromise('drain: single-yield iterable returns that value', async (t, resolve) => {
  async function* gen() {
    yield 42;
  }
  const result = await drain(gen());
  t.equal(result, 42);
  resolve();
});

test.asPromise('drain: multi-yield iterable returns the last value', async (t, resolve) => {
  async function* gen() {
    yield 1;
    yield 2;
    yield 3;
  }
  const result = await drain(gen());
  t.equal(result, 3);
  resolve();
});

test.asPromise('drain: propagates a thrown error', async (t, resolve) => {
  async function* gen() {
    yield 1;
    throw new Error('boom');
  }
  try {
    await drain(gen());
    t.fail('expected throw');
  } catch (e) {
    t.equal(e.message, 'boom');
  }
  resolve();
});

test.asPromise('drain: works on sync iterables too (for-await accepts both)', async (t, resolve) => {
  const result = await drain([1, 2, 3]);
  t.equal(result, 3);
  resolve();
});

test.asPromise('drain: exposed via src/utils/drain.js (Node wrapper)', async (t, resolve) => {
  const mod = await import('../../src/utils/drain.js');
  t.equal(typeof mod.default, 'function');
  t.equal(mod.default, mod.drain);
  t.equal(await mod.default([1, 2]), 2);
  resolve();
});
