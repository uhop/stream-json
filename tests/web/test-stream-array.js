// Mirror of tests/node/test-stream-array.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions (chain from stream-chain/web, readWebString,
// drain — identical pipeline construction modulo source paths).

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import streamArray from '../../src/web/streamers/stream-array.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('parser (web): stream array', async (t, resolve, reject) => {
  try {
    const pattern = [0, 1, true, false, null, {}, [], {a: 'b'}, ['c']];
    const result = [];
    const pipeline = chain([readWebString(JSON.stringify(pattern)), streamArray.withParser()]);
    const out = await drain(pipeline);
    out.forEach(object => (result[object.key] = object.value));
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream array - fail', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString(' true '), streamArray.withParser()]);
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

test.asPromise('parser (web): stream - array filter', async (t, resolve, reject) => {
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
    const pipeline = chain([readWebString(JSON.stringify(input)), streamArray.withParser({objectFilter: f})]);
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

test.asPromise('parser (web): stream array - filter include undecided', async (t, resolve, reject) => {
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
    const pipeline = chain([readWebString(JSON.stringify(input)), streamArray.withParser({objectFilter: f, includeUndecided: true})]);
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

test.asPromise('parser (web): stream array - replacer and reviver', async (t, resolve, reject) => {
  try {
    const reviver = (k, v) => {
      if (/Date$/.test(k) && typeof v == 'string') return new Date(Date.parse(v));
      return v;
    };

    const source = [{createdDate: new Date(), updatedDate: new Date(), user: 'bob', life: 42}];
    const json = JSON.stringify(source);

    const pipeline = chain([readWebString(json), streamArray.withParser({reviver})]);
    const out = await drain(pipeline);
    const result = out.map(o => o.value);
    t.deepEqual(result, source);
    resolve();
  } catch (e) {
    reject(e);
  }
});
