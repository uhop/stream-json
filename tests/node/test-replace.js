import test from 'tape-six';
import chain, {none, many} from 'stream-chain';

import replace from '../../src/filters/replace.js';
import {parser} from '../../src/index.js';
import streamArray from '../../src/streamers/stream-array.js';
import stringer from '../../src/stringer.js';

import {readString} from '../helpers.js';

test.asPromise('replace', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), replace.withParser({packValues: false, filter: stack => stack[0] % 2})]),
    expected = [
      'startArray',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'startObject',
      'endObject',
      'endObject',
      // 'nullValue', // removed
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'nullValue',
      'endObject',
      // 'nullValue', // removed
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'startString',
      'stringChunk',
      'endString',
      'endObject',
      'endArray'
    ],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

const nullToken = {name: 'nullValue', value: null};

test.asPromise('replace: nulls for arrays', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({
        packValues: false,
        filter: stack => stack[0] % 2,
        replacement: stack => (stack.length && typeof stack[stack.length - 1] == 'number' ? nullToken : none)
      })
    ]),
    expected = [
      'startArray',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'startObject',
      'endObject',
      'endObject',
      'nullValue',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'nullValue',
      'endObject',
      'nullValue',
      'startObject',
      'startKey',
      'stringChunk',
      'endKey',
      'keyValue',
      'startString',
      'stringChunk',
      'endString',
      'endObject',
      'endArray'
    ],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: no streaming', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), replace.withParser({streamValues: false, filter: stack => stack[0] % 2, streamValues: false})]),
    expected = [
      'startArray',
      'startObject',
      'keyValue',
      'startObject',
      'endObject',
      'endObject',
      // 'nullValue', // removed
      'startObject',
      'keyValue',
      'nullValue',
      'endObject',
      // 'nullValue', // removed
      'startObject',
      'keyValue',
      'stringValue',
      'endObject',
      'endArray'
    ],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.name));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: objects', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), replace.withParser({filter: stack => stack[0] % 2}), streamArray()]),
    expected = [{a: {}}, {c: null}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: objects with a string filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), replace.withParser({filter: '1'}), streamArray()]),
    expected = [{a: {}}, {c: null}, {d: 1}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: objects with a RegExp filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), replace.withParser({filter: /\b[1-5]\.[a-d]\b/, replacement: () => nullToken}), streamArray()]),
    expected = [{a: {}}, {b: null}, {c: null}, {d: null}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: empty', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([readString(JSON.stringify(input)), replace.withParser({filter: stack => stack.length, replacement: () => nullToken}), streamArray()]),
    expected = [null, null, null, null, null],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: objects once w/ RegExp filter', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({filter: /\b[1-5]\.[a-d]\b/, once: true, replacement: () => nullToken}),
      streamArray()
    ]),
    expected = [{a: {}}, {b: null}, {c: null}, {d: 1}, {e: 'e'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: many', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: many([{name: 'startNumber'}, {name: 'numberChunk', value: '0'}, {name: 'endNumber'}, {name: 'numberValue', value: '0'}])
      }),
      streamArray()
    ]),
    expected = [{a: 0}, {b: 0}, {c: 0}, {d: 0}, {e: 0}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: array', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: [{name: 'startNumber'}, {name: 'numberChunk', value: '0'}, {name: 'endNumber'}, {name: 'numberValue', value: '0'}]
      }),
      streamArray()
    ]),
    expected = [{a: 0}, {b: 0}, {c: 0}, {d: 0}, {e: 0}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: string', (t, resolve, reject) => {
  const replacement = (_stack, chunk) => [
    {name: 'startString'},
    {name: 'stringChunk', value: chunk.name},
    {name: 'endString'},
    {name: 'stringValue', value: chunk.name}
  ];

  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement
      }),
      streamArray()
    ]),
    expected = [{a: 'startObject'}, {b: 'startArray'}, {c: 'nullValue'}, {d: 'startNumber'}, {e: 'startString'}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: empty replacement', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: () => none
      }),
      streamArray()
    ]),
    expected = [{}, {}, {}, {}, {}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: null replacement', (t, resolve, reject) => {
  const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({
        filter: /^\d\.\w\b/,
        replacement: () => nullToken
      }),
      streamArray()
    ]),
    expected = [{a: null}, {b: null}, {c: null}, {d: null}, {e: null}],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: empty replacement on flat object (bug175)', (t, resolve, reject) => {
  const input = {StatusCode: 200, StatusMessage: 'Success', Results: 'test'},
    pipeline = chain([readString(JSON.stringify(input)), replace.withParser({filter: 'Results', replacement: []}), stringer()]),
    chunks = [];

  pipeline.on('data', chunk => chunks.push(chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const result = JSON.parse(chunks.join(''));
    t.deepEqual(result, {StatusCode: 200, StatusMessage: 'Success'});
    resolve();
  });
});

test.asPromise('replace: bug63', (t, resolve, reject) => {
  const input = [true, 42, {a: true, b: 42, c: 'hello'}, 'hello'],
    pipeline = chain([
      readString(JSON.stringify(input)),
      replace.withParser({
        packValues: true,
        streamValues: false,
        filter: '2.b',
        replacement: {name: 'numberValue', value: '0'}
      }),
      streamArray()
    ]),
    expected = [true, 42, {a: true, b: 0, c: 'hello'}, 'hello'],
    result = [];

  pipeline.on('data', chunk => result.push(chunk.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('replace: default options keep keys for a streamer (#216)', (t, resolve, reject) => {
  const input = [{a: {b: 1}, c: 2, d: 3}],
    result = [],
    pipeline = chain([readString(JSON.stringify(input)), parser(), replace({filter: '0.c', replacement: [{name: 'nullValue', value: null}]}), streamArray()]);

  pipeline.on('data', item => result.push(item.value));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [{a: {b: 1}, c: null, d: 3}]);
    resolve();
  });
});

// plain values as replacements: disassembled into tokens

const replaceAll = (input, replacement, options) =>
  new Promise((resolve, reject) => {
    const result = [],
      pipeline = chain([readString(JSON.stringify(input)), replace.withParser({filter: /^\d+\.a$/, replacement, ...options}), streamArray()]);
    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(result));
  });

const namesOf = (text, options) =>
  new Promise((resolve, reject) => {
    const names = [],
      pipeline = chain([readString(text), replace.withParser({filter: 'a', replacement: 0, ...options})]);
    pipeline.on('data', token => names.push(token.name));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(names));
  });

test.asPromise('replace: plain values', async (t, resolve, reject) => {
  try {
    const input = [{a: 1}, {a: 2}, {a: {b: 3}}];
    for (const replacement of [0, -1.5, 'str', '', null, false, true, [1, 'y'], {x: [1, {y: null}]}, {}]) {
      t.deepEqual(
        await replaceAll(input, replacement),
        input.map(() => ({a: replacement})),
        JSON.stringify(replacement)
      );
    }
    t.deepEqual(
      await replaceAll(input, []),
      input.map(() => ({})),
      'an empty array is an empty token list: the value is removed'
    );
    t.deepEqual(
      await replaceAll(input, (_stack, chunk) => ({was: chunk.name})),
      input.map(() => ({a: {was: 'startNumber'}})).map((x, i) => (i === 2 ? {a: {was: 'startObject'}} : x)),
      'function returning a plain value'
    );
    t.deepEqual(
      (await namesOf('{"a": 1}', {packValues: false})).filter(name => /Number|numberChunk|numberValue/.test(name)),
      ['startNumber', 'numberChunk', 'endNumber'],
      'replacement tokens follow the pipeline packing options (streamed only)'
    );
    t.deepEqual(
      (await namesOf('{"a": 1}', {streamValues: false})).filter(name => /Number|numberChunk|numberValue/.test(name)),
      ['numberValue'],
      'replacement tokens follow the pipeline streaming options (packed only)'
    );
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('replace: plain value through stringer', (t, resolve, reject) => {
  let result = '';
  const pipeline = chain([readString('{"a": 1, "b": [2, 3], "c": 4}'), replace.withParser({filter: 'b', replacement: {c: null, d: 'x'}}), stringer()]);
  pipeline.on('data', chunk => (result += chunk));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result, '{"a":1,"b":{"c":null,"d":"x"},"c":4}');
    resolve();
  });
});
