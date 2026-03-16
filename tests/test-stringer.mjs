import test from 'tape-six';
import chain from 'stream-chain';

import makeParser, {parser} from '../src/index.js';
import Stringer from '../src/stringer.js';

import readString from './read-string.mjs';

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

test.asPromise('stringer: roundtrip', (t, resolve, reject) => {
  const string = JSON.stringify(pattern);
  let buffer = '';

  const pipeline = chain([readString(string), parser(), Stringer.make()]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, string);
    resolve();
  });
});

test.asPromise('stringer: no packing', (t, resolve, reject) => {
  const string = JSON.stringify(pattern);
  let buffer = '';

  const pipeline = chain([readString(string), parser({packValues: false}), Stringer.make()]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, string);
    resolve();
  });
});

test.asPromise('stringer: useValues', (t, resolve, reject) => {
  const string = JSON.stringify(pattern);
  let buffer = '';

  const pipeline = chain([readString(string), parser(), Stringer.make({useValues: true})]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, string);
    resolve();
  });
});

test.asPromise('stringer: json streaming objects', (t, resolve, reject) => {
  let string = JSON.stringify(pattern);
  string += string;
  let buffer = '';

  const pipeline = chain([readString(string), parser({jsonStreaming: true}), Stringer.make()]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, string);
    resolve();
  });
});

test.asPromise('stringer: json streaming objects as array', (t, resolve, reject) => {
  let string = JSON.stringify(pattern);
  const shouldBe = '[' + string + ',' + string + ']';
  string += string;
  let buffer = '';

  const pipeline = chain([readString(string), parser({jsonStreaming: true}), Stringer.make({makeArray: true})]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, shouldBe);
    resolve();
  });
});

test.asPromise('stringer: no input as array', (t, resolve, reject) => {
  let buffer = '';

  const pipeline = chain([readString(''), parser({jsonStreaming: true}), Stringer.make({makeArray: true})]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, '[]');
    resolve();
  });
});

test.asPromise('stringer: json streaming primitives', (t, resolve, reject) => {
  const string = '1 2 "zzz" "z\'z\\"z" null true false 1[]null{}true';
  let buffer = '';

  const pipeline = chain([readString(string), parser({jsonStreaming: true}), Stringer.make()]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, string);
    resolve();
  });
});

test.asPromise('stringer: special symbols', (t, resolve, reject) => {
  const object = {
      message: 'Test\tmessage\nWith\bnew\flineAndControlCharacters\u001F\r\ntest\\...'
    },
    string = JSON.stringify(object);
  let buffer = '';

  const pipeline = chain([readString(string), parser({jsonStreaming: true}), Stringer.make()]);

  pipeline.on('data', data => (buffer += data));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(buffer, string);
    resolve();
  });
});

test.asPromise('stringer: control characters with useValues', (t, resolve, reject) => {
  const pipeline = chain([readString('{"a":"hello\\nworld\\t!\\u0000end"}'), parser(), Stringer.make({useValues: true})]);
  let result = '';

  pipeline.on('data', chunk => (result += chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result, '{"a":"hello\\nworld\\t!\\u0000end"}');
    resolve();
  });
});
