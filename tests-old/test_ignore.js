'use strict';

const unit = require('heya-unit');
const {chain} = require('stream-chain');

const {parser} = require('../Parser');
const {streamArray} = require('../streamers/StreamArray');
const {ignore} = require('../filters/Ignore');

const {readString} = require('./ReadString');

unit.add(module, [
  function test_ignore_events(t) {
    const async = t.startAsync('test_ignore_events');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({packKeys: true, packValues: false}), ignore({filter: stack => stack[0] % 2})]),
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
        'startObject',
        'startKey',
        'stringChunk',
        'endKey',
        'keyValue',
        'nullValue',
        'endObject',
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
    pipeline.on('end', () => {
      eval(t.ASSERT('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_ignore_events_no_streaming(t) {
    const async = t.startAsync('test_ignore_events_no_streaming');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([
        readString(JSON.stringify(input)),
        parser({packKeys: true, packValues: false, streamValues: false}),
        ignore({filter: stack => stack[0] % 2, streamValues: false})
      ]),
      expected = [
        'startArray',
        'startObject',
        'keyValue',
        'startObject',
        'endObject',
        'endObject',
        'startObject',
        'keyValue',
        'nullValue',
        'endObject',
        'startObject',
        'keyValue',
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
  function test_ignore_objects(t) {
    const async = t.startAsync('test_ignore_objects');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), ignore({filter: stack => stack[0] % 2}), streamArray()]),
      expected = [{a: {}}, {c: null}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_ignore_objects_string_filter(t) {
    const async = t.startAsync('test_ignore_objects_string_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), ignore({filter: '1'}), streamArray()]),
      expected = [{a: {}}, {c: null}, {d: 1}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_ignore_objects_regexp_filter(t) {
    const async = t.startAsync('test_ignore_objects_regexp_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), ignore({filter: /\b[1-5]\.[a-d]\b/}), streamArray()]),
      expected = [{a: {}}, {}, {}, {}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_ignore_empty(t) {
    const async = t.startAsync('test_ignore_empty');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), ignore({filter: stack => stack.length}), streamArray()]),
      expected = [],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_ignore_objects_once(t) {
    const async = t.startAsync('test_ignore_objects_regexp_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), ignore({filter: /\b[1-5]\.[a-d]\b/, once: true}), streamArray()]),
      expected = [{a: {}}, {}, {c: null}, {d: 1}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  }
]);
