'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import streamObject from '../src/streamers/stream-object.js';

import readString from './read-string.mjs';

test.asPromise('parser: stream object', (t, resolve, reject) => {
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
    },
    result = {},
    pipeline = chain([readString(JSON.stringify(pattern)), streamObject.withParser()]);

  pipeline.on('data', data => (result[data.key] = data.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });
});

test.asPromise('parser: stream object - fail', (t, resolve, reject) => {
  const stream = streamObject.withParserAsStream();

  stream.on('data', value => t.fail("We shouldn't be here."));
  stream.on('error', err => {
    t.ok(err);
    resolve();
  });
  stream.on('end', value => {
    t.fail("We shouldn't be here.");
    reject();
  });

  readString(' true ').pipe(stream);
});

test.asPromise('parser: stream object - no streaming', (t, resolve, reject) => {
  const stream = streamObject.withParserAsStream({streamValues: false}),
    pattern = {
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
    },
    result = {};

  stream.on('data', data => (result[data.key] = data.value));
  stream.on('error', reject);
  stream.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });

  readString(JSON.stringify(pattern)).pipe(stream);
});

test.asPromise('parser: stream object - filter', (t, resolve, reject) => {
  const f = assembler => {
    if (assembler.depth == 2 && assembler.key === null) {
      if (assembler.current instanceof Array) {
        return false; // reject
      }
      switch (assembler.current.a) {
        case 'accept':
          return true; // accept
        case 'reject':
          return false; // reject
      }
    }
    // undecided
  };

  const stream = streamObject.withParserAsStream({objectFilter: f}),
    input = {
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
    },
    result = [];

  stream.on('data', object => result.push(object.value));
  stream.on('error', reject);
  stream.on('end', () => {
    result.forEach(o => {
      if (typeof o == 'object' && o) {
        t.notOk(o instanceof Array);
        t.equal(o.a, 'accept');
      } else {
        t.fail("We shouldn't be here.");
      }
    });
    resolve();
  });

  readString(JSON.stringify(input)).pipe(stream);
});
