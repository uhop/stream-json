// Mirror of tests/node/test-stream-object.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import streamObject from '../../src/web/streamers/stream-object.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('parser (web): stream object', async (t, resolve, reject) => {
  try {
    const pattern = {
      str: 'bar',
      baz: null,
      t: true,
      f: false,
      zero: 0,
      one: 1,
      obj: {},
      arr: [],
      deepObj: {a: 'b'},
      deepArr: ['c'],
      '': '' // tricky, yet legal
    };
    const result = {};
    const pipeline = chain([readWebString(JSON.stringify(pattern)), streamObject.withParser()]);
    const out = await drain(pipeline);
    out.forEach(data => (result[data.key] = data.value));
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream object - fail', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString(' true '), streamObject.withParser()]);
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

test.asPromise('parser (web): stream object - no streaming', async (t, resolve, reject) => {
  try {
    const pattern = {
      str: 'bar',
      baz: null,
      t: true,
      f: false,
      zero: 0,
      one: 1,
      obj: {},
      arr: [],
      deepObj: {a: 'b'},
      deepArr: ['c'],
      '': ''
    };
    const result = {};
    const pipeline = chain([readWebString(JSON.stringify(pattern)), streamObject.withParser({streamValues: false})]);
    const out = await drain(pipeline);
    out.forEach(data => (result[data.key] = data.value));
    t.deepEqual(result, pattern);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream object - filter', async (t, resolve, reject) => {
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

    const input = {
      a: 0,
      b: 1,
      c: true,
      d: false,
      e: null,
      f: {},
      g: [],
      h: {a: 'reject', b: [[[]]]},
      i: ['c'],
      j: {a: 'accept'},
      k: {a: 'neutral'},
      l: {x: true, a: 'reject'},
      m: {y: null, a: 'accept'},
      n: {z: 1234, a: 'neutral'},
      o: {w: '12', a: 'neutral'}
    };
    const pipeline = chain([readWebString(JSON.stringify(input)), streamObject.withParser({objectFilter: f})]);
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

test.asPromise('parser (web): stream object - filter include undecided', async (t, resolve, reject) => {
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

    const input = {
      a: 0,
      b: 1,
      c: true,
      d: false,
      e: null,
      f: {},
      g: [],
      h: {a: 'reject', b: [[[]]]},
      i: ['c'],
      j: {a: 'accept'},
      k: {a: 'neutral'},
      l: {x: true, a: 'reject'},
      m: {y: null, a: 'accept'},
      n: {z: 1234, a: 'neutral'},
      o: {w: '12', a: 'neutral'}
    };
    const pipeline = chain([readWebString(JSON.stringify(input)), streamObject.withParser({objectFilter: f, includeUndecided: true})]);
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

test.asPromise('parser (web): stream object - replacer and reviver', async (t, resolve, reject) => {
  try {
    const reviver = (k, v) => {
      if (/Date$/.test(k) && typeof v == 'string') return new Date(Date.parse(v));
      return v;
    };

    const source = {
      createdDate: new Date(),
      updatedDate: new Date(),
      user: 'bob',
      life: 42
    };
    const json = JSON.stringify(source);

    const pipeline = chain([readWebString(json), streamObject.withParser({reviver})]);
    const out = await drain(pipeline);
    const result = {};
    out.forEach(object => (result[object.key] = object.value));
    t.deepEqual(result, source);
    resolve();
  } catch (e) {
    reject(e);
  }
});
