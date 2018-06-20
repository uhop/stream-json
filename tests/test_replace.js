'use strict';

const unit = require('heya-unit');
const {chain} = require('stream-chain');

const {parser} = require('../Parser');
const {streamArray} = require('../streamers/StreamArray');
const {replace} = require('../filters/Replace');

const {readString} = require('./ReadString');

unit.add(module, [
  function test_replace_events(t) {
    const async = t.startAsync('test_replace_events');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({packValues: false}), replace({filter: stack => stack[0] % 2})]),
      expected = [
        'startArray',
        'startObject',
        'startKey',
        'stringChunk',
        'endKey',
        'startObject',
        'endObject',
        'endObject',
        'nullValue',
        'startObject',
        'startKey',
        'stringChunk',
        'endKey',
        'nullValue',
        'endObject',
        'nullValue',
        'startObject',
        'startKey',
        'stringChunk',
        'endKey',
        'startString',
        'stringChunk',
        'endString',
        'endObject',
        'endArray'
      ],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.name));
    pipeline.on('end', () => {
      eval(t.ASSERT('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_events_no_streaming(t) {
    const async = t.startAsync('test_replace_events_no_streaming');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({streamValues: false}), replace({filter: stack => stack[0] % 2, streamValues: false})]),
      expected = [
        'startArray',
        'startObject',
        'keyValue',
        'startObject',
        'endObject',
        'endObject',
        'nullValue',
        'startObject',
        'keyValue',
        'nullValue',
        'endObject',
        'nullValue',
        'startObject',
        'keyValue',
        'stringValue',
        'endObject',
        'endArray'
      ],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.name));
    pipeline.on('end', () => {
      eval(t.ASSERT('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_objects(t) {
    const async = t.startAsync('test_replace_objects');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), replace({filter: stack => stack[0] % 2}), streamArray()]),
      expected = [{a: {}}, null, {c: null}, null, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_objects_string_filter(t) {
    const async = t.startAsync('test_replace_objects_string_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), replace({filter: '1'}), streamArray()]),
      expected = [{a: {}}, null, {c: null}, {d: 1}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_objects_regexp_filter(t) {
    const async = t.startAsync('test_replace_objects_regexp_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), replace({filter: /\b[1-5]\.[a-d]\b/}), streamArray()]),
      expected = [{a: {}}, {b: null}, {c: null}, {d: null}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_empty(t) {
    const async = t.startAsync('test_replace_empty');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), replace({filter: stack => stack.length}), streamArray()]),
      expected = [null, null, null, null, null],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_objects_once(t) {
    const async = t.startAsync('test_replace_objects_regexp_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), replace({filter: /\b[1-5]\.[a-d]\b/, once: true}), streamArray()]),
      expected = [{a: {}}, {b: null}, {c: null}, {d: 1}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_with_array_replacement(t) {
    const async = t.startAsync('test_replace_with_array_replacement');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([
        readString(JSON.stringify(input)),
        parser(),
        replace({
          filter: /^\d\.\w\b/,
          replacement: [{name: 'startNumber'}, {name: 'numberChunk', value: '0'}, {name: 'endNumber'}, {name: 'numberValue', value: '0'}]
        }),
        streamArray()
      ]),
      expected = [{a: 0}, {b: 0}, {c: 0}, {d: 0}, {e: 0}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_with_functional_replacement(t) {
    const async = t.startAsync('test_replace_with_functional_replacement');

    const typeString = (stack, chunk) => [
      {name: 'startString'},
      {name: 'stringChunk', value: chunk.name},
      {name: 'endString'},
      {name: 'stringValue', value: chunk.name}
    ];

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([
        readString(JSON.stringify(input)),
        parser(),
        replace({
          filter: /^\d\.\w\b/,
          replacement: typeString
        }),
        streamArray()
      ]),
      expected = [{a: 'startObject'}, {b: 'startArray'}, {c: 'nullValue'}, {d: 'startNumber'}, {e: 'startString'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_with_nothing(t) {
    const async = t.startAsync('test_replace_with_nothing');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([
        readString(JSON.stringify(input)),
        parser(),
        replace({
          filter: /^\d\.\w\b/,
          replacement: [],
          allowEmptyReplacement: true
        }),
        streamArray()
      ]),
      expected = [{}, {}, {}, {}, {}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_replace_with_default(t) {
    const async = t.startAsync('test_replace_with_nothing');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([
        readString(JSON.stringify(input)),
        parser(),
        replace({
          filter: /^\d\.\w\b/,
          replacement: []
        }),
        streamArray()
      ]),
      expected = [{a: null}, {b: null}, {c: null}, {d: null}, {e: null}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  }
]);
