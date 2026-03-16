import fs from 'node:fs';
import zlib from 'node:zlib';
import {Writable, Transform} from 'node:stream';

import test from 'tape-six';

import JsonlParser from '../src/jsonl/parser.js';
import JsonlStringer from '../src/jsonl/stringer.js';

import readString from './read-string.mjs';

const roundtrip = (len, quant) => (t, resolve, reject) => {
  const objects = [];
  for (let n = 0; n < len; n += 1) {
    objects.push({
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [n + 1, n + 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false],
      n
    });
  }

  const json = [];
  for (let n = 0; n < objects.length; n += 1) {
    json.push(JSON.stringify(objects[n]));
  }

  const input = json.join('\n'),
    result = [];

  const pipeline = readString(input, quant).pipe(JsonlParser.make());

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, objects);
    resolve();
  });
};

test.asPromise('jsonl parser: len=1', roundtrip(1));
test.asPromise('jsonl parser: len=2', roundtrip(2));
test.asPromise('jsonl parser: len=3', roundtrip(3));
test.asPromise('jsonl parser: len=5', roundtrip(5));
test.asPromise('jsonl parser: len=10', roundtrip(10));
test.asPromise('jsonl parser: len=5 quant=3', roundtrip(5, 3));
test.asPromise('jsonl parser: len=10 quant=7', roundtrip(10, 7));

test.asPromise('jsonl parser: file', (t, resolve, reject) => {
  let count = 0;
  const fileName = new URL('./data/sample.jsonl.gz', import.meta.url);

  fs.createReadStream(fileName)
    .pipe(zlib.createGunzip())
    .pipe(JsonlParser.make())
    .pipe(
      new Writable({
        objectMode: true,
        write(chunk, _, callback) {
          t.equal(count, chunk.key);
          ++count;
          callback(null);
        },
        final(callback) {
          t.equal(count, 100);
          resolve();
          callback(null);
        }
      })
    )
    .on('error', reject);
});

test.asPromise('jsonl stringer: single', (t, resolve, reject) => {
  const pattern = {
      a: [[[]]],
      b: {a: 1},
      c: {a: 1, b: 2},
      d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
      e: 1,
      f: '',
      g: true,
      h: false,
      i: null,
      j: [],
      k: {}
    },
    string = JSON.stringify(pattern);

  let buffer = '';
  readString(string)
    .pipe(JsonlParser.make())
    .pipe(
      new Transform({
        writableObjectMode: true,
        readableObjectMode: true,
        transform(chunk, _, callback) {
          this.push(chunk.value);
          callback(null);
        }
      })
    )
    .pipe(JsonlStringer.make())
    .pipe(
      new Writable({
        write(chunk, _, callback) {
          buffer += chunk;
          callback(null);
        },
        final(callback) {
          t.equal(buffer, string);
          resolve();
          callback(null);
        }
      })
    )
    .on('error', reject);
});

test.asPromise('jsonl stringer: multiple', (t, resolve, reject) => {
  const pattern = {
    a: [[[]]],
    b: {a: 1},
    c: {a: 1, b: 2},
    d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
    e: 1,
    f: '',
    g: true,
    h: false,
    i: null,
    j: [],
    k: {}
  };

  let string = JSON.stringify(pattern);
  const expected = string + '\n' + string + '\n' + string;

  let buffer = '';
  readString(expected + '\n')
    .pipe(JsonlParser.make())
    .pipe(
      new Transform({
        writableObjectMode: true,
        readableObjectMode: true,
        transform(chunk, _, callback) {
          this.push(chunk.value);
          callback(null);
        }
      })
    )
    .pipe(JsonlStringer.make())
    .pipe(
      new Writable({
        write(chunk, _, callback) {
          buffer += chunk;
          callback(null);
        },
        final(callback) {
          t.equal(buffer, expected);
          resolve();
          callback(null);
        }
      })
    )
    .on('error', reject);
});

test.asPromise('jsonl stringer: custom separator', (t, resolve, reject) => {
  const stringer = JsonlStringer.make({separator: '\r\n'});
  let result = '';

  stringer.on('data', chunk => (result += chunk));
  stringer.on('error', reject);
  stringer.on('end', () => {
    t.equal(result, '{"a":1}\r\n{"b":2}\r\n{"c":3}');
    resolve();
  });

  stringer.write({a: 1});
  stringer.write({b: 2});
  stringer.write({c: 3});
  stringer.end();
});

test.asPromise('jsonl stringer: default separator', (t, resolve, reject) => {
  const stringer = JsonlStringer.make();
  let result = '';

  stringer.on('data', chunk => (result += chunk));
  stringer.on('error', reject);
  stringer.on('end', () => {
    t.equal(result, '1\n2\n3');
    resolve();
  });

  stringer.write(1);
  stringer.write(2);
  stringer.write(3);
  stringer.end();
});

test.asPromise('jsonl parser: invalid JSON at end (checkErrors)', (t, resolve, reject) => {
  const stream = JsonlParser.make({checkErrors: true});

  stream.on('error', () => resolve());
  stream.on('end', () => {
    t.fail("We shouldn't be here.");
    reject();
  });

  readString('{').pipe(stream);
});

test.asPromise('jsonl parser: invalid JSON in middle (checkErrors)', (t, resolve, reject) => {
  const stream = JsonlParser.make({checkErrors: true});

  stream.on('error', () => resolve());
  stream.on('end', () => {
    t.fail("We shouldn't be here.");
    reject();
  });

  readString('{}\n]\n1').pipe(stream);
});

test.asPromise('jsonl parser: skip errors', (t, resolve, reject) => {
  const stream = JsonlParser.make({errorIndicator: undefined}),
    result = [];

  stream.on('data', data => result.push(data));
  stream.on('error', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
  stream.on('end', () => {
    t.deepEqual(result, [
      {key: 0, value: 1},
      {key: 1, value: 2},
      {key: 2, value: 3}
    ]);
    resolve();
  });

  readString('{\n1\n]\n2\n3').pipe(stream);
});

test.asPromise('jsonl parser: replace errors with null', (t, resolve, reject) => {
  const stream = JsonlParser.make({errorIndicator: null}),
    result = [];

  stream.on('data', data => result.push(data));
  stream.on('error', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
  stream.on('end', () => {
    t.deepEqual(result, [
      {key: 0, value: null},
      {key: 1, value: 1},
      {key: 2, value: null},
      {key: 3, value: 2},
      {key: 4, value: 3}
    ]);
    resolve();
  });

  readString('{\n1\n]\n2\n3').pipe(stream);
});

test.asPromise('jsonl parser: transform errors', (t, resolve, reject) => {
  const stream = JsonlParser.make({errorIndicator: error => error.name}),
    result = [];

  stream.on('data', data => result.push(data));
  stream.on('error', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
  stream.on('end', () => {
    t.deepEqual(result, [
      {key: 0, value: 'SyntaxError'},
      {key: 1, value: 1},
      {key: 2, value: 'SyntaxError'},
      {key: 3, value: 2},
      {key: 4, value: 3}
    ]);
    resolve();
  });

  readString('{\n1\n]\n2\n3').pipe(stream);
});

test.asPromise('jsonl parser: forward raw value on error', (t, resolve, reject) => {
  const stream = JsonlParser.make({errorIndicator: (e, val) => val}),
    result = [];

  stream.on('data', data => result.push(data));
  stream.on('error', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
  stream.on('end', () => {
    t.deepEqual(result, [
      {key: 0, value: '{'},
      {key: 1, value: 1},
      {key: 2, value: ']'},
      {key: 3, value: 2},
      {key: 4, value: 3}
    ]);
    resolve();
  });

  readString('{\n1\n]\n2\n3').pipe(stream);
});
