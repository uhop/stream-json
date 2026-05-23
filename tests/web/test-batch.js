// Mirror of tests/node/test-batch.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import streamArray from '../../src/web/streamers/stream-array.js';
import batch from '../../src/web/utils/batch.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('batch (web): basic', async (t, resolve, reject) => {
  try {
    const pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']];
    const result = [];
    const pipeline = chain([readWebString(JSON.stringify(pattern)), streamArray.withParser(), batch({batchSize: 2})]);
    for await (const b of pipeline.readable) {
      t.ok(b.length === 2 || b.length === 1);
      b.forEach(object => (result[object.key] = object.value));
    }
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('batch (web): fail on non-array', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString(' true '), streamArray.withParser(), batch()]);
    try {
      const out = await drain(pipeline);
      if (out.length) t.fail('produced output despite expected failure');
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

test.asPromise('batch (web): objectFilter', async (t, resolve, reject) => {
  try {
    const f = assembler => {
      if (assembler.depth == 2 && assembler.key === null) {
        if (assembler.current instanceof Array) {
          return false;
        }
        switch (assembler.current.a) {
          case 'accept':
            return true;
          case 'reject':
            return false;
        }
      }
    };

    const input = [
      0,
      1,
      true,
      false,
      null,
      {},
      [],
      {a: 'reject', b: [[[]]]},
      ['c'],
      {a: 'accept'},
      {a: 'neutral'},
      {x: true, a: 'reject'},
      {y: null, a: 'accept'},
      {z: 1234, a: 'neutral'},
      {w: '12', a: 'neutral'}
    ];
    const keys = [];
    const pipeline = chain([readWebString(JSON.stringify(input)), streamArray.withParser({objectFilter: f}), batch({batchSize: 5})]);
    for await (const b of pipeline.readable) {
      b.forEach(object => keys.push(object.key));
    }
    t.deepEqual(keys, [6, 8]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('batch (web): objectFilter includeUndecided', async (t, resolve, reject) => {
  try {
    const f = assembler => {
      if (assembler.depth == 2 && assembler.key === null) {
        if (assembler.current instanceof Array) {
          return false;
        }
        switch (assembler.current.a) {
          case 'accept':
            return true;
          case 'reject':
            return false;
        }
      }
    };

    const input = [
      0,
      1,
      true,
      false,
      null,
      {},
      [],
      {a: 'reject', b: [[[]]]},
      ['c'],
      {a: 'accept'},
      {a: 'neutral'},
      {x: true, a: 'reject'},
      {y: null, a: 'accept'},
      {z: 1234, a: 'neutral'},
      {w: '12', a: 'neutral'}
    ];
    const keys = [];
    const pipeline = chain([readWebString(JSON.stringify(input)), streamArray.withParser({objectFilter: f, includeUndecided: true}), batch({batchSize: 5})]);
    for await (const b of pipeline.readable) {
      b.forEach(object => keys.push(object.key));
    }
    t.deepEqual(keys, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test('batch (web): truncates fractional batchSize', t => {
  const pair = batch.asWebStream({batchSize: 2.7});
  t.equal(pair._batchSize, 2);
});

test('batch (web): batchSize between 0 and 1', t => {
  const pair = batch.asWebStream({batchSize: 0.5});
  t.equal(pair._batchSize, 1);
});
