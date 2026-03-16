import {Readable} from 'node:stream';

import test from 'tape-six';

import verifier from '../src/utils/verifier.js';

import readString from './read-string.mjs';

test.asPromise('verifier: valid array', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('[1,2,3]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('verifier: valid array with newlines', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('[\n1,\n2,\n3\n]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('verifier: valid array with CRLF', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('[\r\n1,\r\n2,\r\n3\r\n]').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('verifier: valid jsonStreaming', (t, resolve, reject) => {
  const stream = verifier.asStream({jsonStreaming: true}),
    pipeline = readString('1 2 3').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('verifier: error position - missing comma', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('[1,2 3]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 1);
    t.equal(error.pos, 6);
    t.equal(error.offset, 5);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: error position - missing comma with newlines', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('[\n1,\n2\n3\n]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 4);
    t.equal(error.pos, 1);
    t.equal(error.offset, 7);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: error position - missing comma with CRLF', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('[\r\n1,\r\n2\r\n3\r\n]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 4);
    t.equal(error.pos, 1);
    t.equal(error.offset, 10);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: error - comma in jsonStreaming', (t, resolve, reject) => {
  const stream = verifier.asStream({jsonStreaming: true}),
    pipeline = readString('1 , 3').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 1);
    t.equal(error.pos, 3);
    t.equal(error.offset, 2);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: error - mismatched bracket', (t, resolve, reject) => {
  const stream = verifier.asStream({jsonStreaming: true}),
    pipeline = readString('{"x":1]').pipe(stream);

  pipeline.on('error', error => {
    t.equal(error.line, 1);
    t.equal(error.pos, 7);
    t.equal(error.offset, 6);
    resolve();
  });
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: infinite fail', (t, resolve, reject) => {
  const sample = '{"key1":1}garbage{"key3":2}',
    stream = verifier.asStream({jsonStreaming: true});

  stream.on('error', () => resolve());
  stream.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });

  Readable.from(
    (function* () {
      while (true) yield sample;
    })()
  ).pipe(stream);
});

test.asPromise('verifier: issue #167 - zero byte', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('"a\x00a"').pipe(stream);

  pipeline.on('error', () => resolve());
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: issue #167 - newline in string', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('"a\na"').pipe(stream);

  pipeline.on('error', () => resolve());
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: issue #167 - tab in string', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('"a\ta"').pipe(stream);

  pipeline.on('error', () => resolve());
  pipeline.on('finish', () => {
    t.fail("We shouldn't be here.");
    reject();
  });
});

test.asPromise('verifier: exponent followed by EOF', (t, resolve, reject) => {
  const stream = verifier.asStream(),
    pipeline = readString('1e2').pipe(stream);

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});
