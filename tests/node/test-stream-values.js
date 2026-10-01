import test from 'tape-six';
import chain from 'stream-chain';

import streamValues from '../../src/streamers/stream-values.js';

import {readString} from '../helpers.js';

test.asPromise('parser: stream values', (t, resolve, reject) => {
  const pattern = [1, 2, 3, true, false, '', 'Abc', [], [1], [1, []], {}, {a: 1}, {b: {}, c: [{}]}],
    result = [],
    pipeline = chain([readString(pattern.map(value => JSON.stringify(value)).join(' ')), streamValues.withParser()]);

  pipeline.on('data', data => (result[data.key] = data.value));
  pipeline.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });
});

test.asPromise('parser: stream values - no streaming tokens', (t, resolve, reject) => {
  const stream = streamValues.withParserAsStream({streamValues: false}),
    pattern = [1, 2, 3, true, false, '', 'Abc', [], [1], [1, []], {}, {a: 1}, {b: {}, c: [{}]}],
    result = [];

  stream.on('data', data => (result[data.key] = data.value));
  stream.on('error', reject);
  stream.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });

  readString(pattern.map(value => JSON.stringify(value)).join(' ')).pipe(stream);
});

test.asPromise('parser: stream values - no values', (t, resolve, reject) => {
  const stream = streamValues.withParserAsStream(),
    result = [];

  stream.on('data', data => (result[data.index] = data.value));
  stream.on('error', reject);
  stream.on('end', () => {
    t.equal(result.length, 0);
    resolve();
  });

  readString('').pipe(stream);
});

test.asPromise('parser: stream values - filter', (t, resolve, reject) => {
  const f = assembler => {
    if (assembler.depth == 1 && assembler.key === null) {
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

  const stream = streamValues.withParserAsStream({objectFilter: f}),
    input = [
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

  readString(input.map(value => JSON.stringify(value)).join(' ')).pipe(stream);
});

test.asPromise('parser: stream values - filter include undecided', (t, resolve, reject) => {
  const f = assembler => {
    if (assembler.depth == 1 && assembler.key === null) {
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

  const stream = streamValues.withParserAsStream({objectFilter: f, includeUndecided: true}),
    input = [
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
    result = [];

  stream.on('data', object => result.push(object.value));
  stream.on('error', reject);
  stream.on('end', () => {
    result.forEach(o => {
      if (typeof o == 'object' && o) {
        t.notOk(o instanceof Array);
        t.notEqual(o.a, 'reject');
      } else {
        t.ok(o === null || typeof o != 'object');
      }
    });
    resolve();
  });

  readString(input.map(value => JSON.stringify(value)).join(' ')).pipe(stream);
});

test.asPromise('parser: stream values - numbers option', (t, resolve, reject) => {
  const result = [],
    pipeline = chain([readString('12345678901234567890 NaN [1e16] 7'), streamValues.withParser({numbers: 'bigint', extendedNumbers: true})]);

  pipeline.on('data', data => result.push(data.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result.length, 4);
    t.equal(result[0], 12345678901234567890n);
    t.ok(Number.isNaN(result[1]));
    t.deepEqual(result[2], [10000000000000000n]);
    t.equal(result[3], 7);
    resolve();
  });
});
