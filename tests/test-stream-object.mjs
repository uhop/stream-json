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
