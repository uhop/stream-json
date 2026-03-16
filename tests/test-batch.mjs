import test from 'tape-six';
import chain from 'stream-chain';

import streamArray from '../src/streamers/stream-array.js';
import Batch from '../src/utils/batch.js';

import readString from './read-string.mjs';

test.asPromise('batch: basic', (t, resolve, reject) => {
  const pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']],
    result = [],
    pipeline = chain([readString(JSON.stringify(pattern)), streamArray.withParser(), Batch.make({batchSize: 2})]);

  pipeline.on('data', batch => {
    t.ok(batch.length === 2 || batch.length === 1);
    batch.forEach(object => (result[object.key] = object.value));
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });
});

test.asPromise('batch: fail on non-array', (t, resolve, reject) => {
  const pipeline = chain([readString(' true '), streamArray.withParser(), Batch.make()]);

  pipeline.on('data', () => t.fail("We shouldn't be here."));
  pipeline.on('error', () => resolve());
  pipeline.on('end', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('batch: objectFilter', (t, resolve, reject) => {
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
    ],
    keys = [],
    pipeline = chain([readString(JSON.stringify(input)), streamArray.withParser({objectFilter: f}), Batch.make({batchSize: 5})]);

  pipeline.on('data', batch => {
    batch.forEach(object => keys.push(object.key));
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(keys, [6, 8]);
    resolve();
  });
});

test.asPromise('batch: objectFilter includeUndecided', (t, resolve, reject) => {
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
    ],
    keys = [],
    pipeline = chain([readString(JSON.stringify(input)), streamArray.withParser({objectFilter: f, includeUndecided: true}), Batch.make({batchSize: 5})]);

  pipeline.on('data', batch => {
    batch.forEach(object => keys.push(object.key));
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(keys, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    resolve();
  });
});

test('batch: truncates fractional batchSize', t => {
  const batch = Batch.make({batchSize: 2.7});
  t.equal(batch._batchSize, 2);
});

test('batch: batchSize between 0 and 1', t => {
  const batch = Batch.make({batchSize: 0.5});
  t.equal(batch._batchSize, 1);
});
