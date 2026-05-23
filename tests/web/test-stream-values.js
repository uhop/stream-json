// Mirror of tests/node/test-stream-values.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import streamValues from '../../src/web/streamers/stream-values.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('parser (web): stream values', async (t, resolve, reject) => {
  try {
    const pattern = [1, 2, 3, true, false, '', 'Abc', [], [1], [1, []], {}, {a: 1}, {b: {}, c: [{}]}];
    const result = [];
    const pipeline = chain([readWebString(pattern.map(value => JSON.stringify(value)).join(' ')), streamValues.withParser()]);
    const out = await drain(pipeline);
    out.forEach(data => (result[data.key] = data.value));
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream values - no streaming tokens', async (t, resolve, reject) => {
  try {
    const pattern = [1, 2, 3, true, false, '', 'Abc', [], [1], [1, []], {}, {a: 1}, {b: {}, c: [{}]}];
    const result = [];
    const pipeline = chain([readWebString(pattern.map(value => JSON.stringify(value)).join(' ')), streamValues.withParser({streamValues: false})]);
    const out = await drain(pipeline);
    out.forEach(data => (result[data.key] = data.value));
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream values - no values', async (t, resolve, reject) => {
  try {
    const result = [];
    const pipeline = chain([readWebString(''), streamValues.withParser()]);
    const out = await drain(pipeline);
    out.forEach(data => (result[data.index] = data.value));
    t.equal(result.length, 0);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream values - filter', async (t, resolve, reject) => {
  try {
    const f = assembler => {
      if (assembler.depth == 1 && assembler.key === null) {
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
    const pipeline = chain([readWebString(input.map(value => JSON.stringify(value)).join(' ')), streamValues.withParser({objectFilter: f})]);
    const out = await drain(pipeline);
    out.forEach(({value: o}) => {
      if (typeof o == 'object' && o) {
        t.notOk(o instanceof Array);
        t.equal(o.a, 'accept');
      } else {
        t.fail("We shouldn't be here.");
      }
    });
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream values - filter include undecided', async (t, resolve, reject) => {
  try {
    const f = assembler => {
      if (assembler.depth == 1 && assembler.key === null) {
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
    const pipeline = chain([
      readWebString(input.map(value => JSON.stringify(value)).join(' ')),
      streamValues.withParser({objectFilter: f, includeUndecided: true})
    ]);
    const out = await drain(pipeline);
    out.forEach(({value: o}) => {
      if (typeof o == 'object' && o) {
        t.notOk(o instanceof Array);
        t.notEqual(o.a, 'reject');
      } else {
        t.ok(o === null || typeof o != 'object');
      }
    });
    resolve();
  } catch (e) {
    reject(e);
  }
});
