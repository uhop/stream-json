'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import {parser} from '../src/parser.js';

import readString from './read-string.js';

test.asPromise('smoke test', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"]}',
    pipeline = chain([readString(input), parser({packValues: false})]),
    result = [];

  pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
  pipeline.on('error', () => reject());
  pipeline.on('end', () => {
    t.ok(result.length === 20);
    t.ok(result[0].name === 'startObject');
    t.ok(result[1].name === 'startKey');
    t.ok(result[2].name === 'stringChunk' && result[2].val === 'a');
    t.ok(result[3].name === 'endKey');
    t.ok(result[4].name === 'startNumber');
    t.ok(result[5].name === 'numberChunk' && result[5].val === '1');
    t.ok(result[6].name === 'endNumber');
    t.ok(result[7].name === 'startKey');
    t.ok(result[8].name === 'stringChunk' && result[8].val === 'b');
    t.ok(result[9].name === 'endKey');
    t.ok(result[10].name === 'trueValue' && result[10].val === true);
    t.ok(result[11].name === 'startKey');
    t.ok(result[12].name === 'stringChunk' && result[12].val === 'c');
    t.ok(result[13].name === 'endKey');
    t.ok(result[14].name === 'startArray');
    t.ok(result[15].name === 'startString');
    t.ok(result[16].name === 'stringChunk' && result[16].val === 'd');
    t.ok(result[17].name === 'endString');
    t.ok(result[18].name === 'endArray');
    t.ok(result[19].name === 'endObject');
    resolve();
  });
});
