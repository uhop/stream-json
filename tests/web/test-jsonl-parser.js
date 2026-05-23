// Mirror of the jsonl parser scenarios from tests/node/test-jsonl.js.
// The 'file' scenario (gzipped sample.jsonl.gz) is skipped on Web — it relies
// on fs/zlib. See tests/web/test-stringer.js for the substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import jsonlParser from '../../src/web/jsonl/parser.js';

import {readWebString, drain} from '../web-helpers.js';

const roundtrip = (len, quant) => async (t, resolve, reject) => {
  try {
    const objects = [];
    for (let n = 0; n < len; n += 1) {
      objects.push({
        stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
        anArray: [n + 1, n + 2, true, 'tabs?\t\t\t', false],
        n
      });
    }

    const json = [];
    for (let n = 0; n < objects.length; n += 1) {
      json.push(JSON.stringify(objects[n]));
    }

    const input = json.join('\n');
    const pipeline = chain([readWebString(input, quant), jsonlParser()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => chunk.value);
    t.deepEqual(result, objects);
    resolve();
  } catch (e) {
    reject(e);
  }
};

test.asPromise('jsonl parser (web): len=1', roundtrip(1));
test.asPromise('jsonl parser (web): len=2', roundtrip(2));
test.asPromise('jsonl parser (web): len=3', roundtrip(3));
test.asPromise('jsonl parser (web): len=5', roundtrip(5));
test.asPromise('jsonl parser (web): len=10', roundtrip(10));
test.asPromise('jsonl parser (web): len=5 quant=3', roundtrip(5, 3));
test.asPromise('jsonl parser (web): len=10 quant=7', roundtrip(10, 7));

test.asPromise('jsonl parser (web): invalid JSON at end (checkErrors)', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{'), jsonlParser({checkErrors: true})]);
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

test.asPromise('jsonl parser (web): invalid JSON in middle (checkErrors)', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{}\n]\n1'), jsonlParser({checkErrors: true})]);
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

test.asPromise('jsonl parser (web): skip errors', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{\n1\n]\n2\n3'), jsonlParser({errorIndicator: undefined})]);
    const result = await drain(pipeline);
    t.deepEqual(result, [
      {key: 0, value: 1},
      {key: 1, value: 2},
      {key: 2, value: 3}
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonl parser (web): replace errors with null', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{\n1\n]\n2\n3'), jsonlParser({errorIndicator: null})]);
    const result = await drain(pipeline);
    t.deepEqual(result, [
      {key: 0, value: null},
      {key: 1, value: 1},
      {key: 2, value: null},
      {key: 3, value: 2},
      {key: 4, value: 3}
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonl parser (web): transform errors', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{\n1\n]\n2\n3'), jsonlParser({errorIndicator: error => error.name})]);
    const result = await drain(pipeline);
    t.deepEqual(result, [
      {key: 0, value: 'SyntaxError'},
      {key: 1, value: 1},
      {key: 2, value: 'SyntaxError'},
      {key: 3, value: 2},
      {key: 4, value: 3}
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonl parser (web): forward raw value on error', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{\n1\n]\n2\n3'), jsonlParser({errorIndicator: (_e, val) => val})]);
    const result = await drain(pipeline);
    t.deepEqual(result, [
      {key: 0, value: '{'},
      {key: 1, value: 1},
      {key: 2, value: ']'},
      {key: 3, value: 2},
      {key: 4, value: 3}
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});
