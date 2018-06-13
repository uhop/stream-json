'use strict';

const unit = require('heya-unit');
const {chain} = require('stream-chain');

const {parser} = require('../Parser');
const {streamArray} = require('../utils/StreamArray');
const {reject} = require('../utils/Reject');

const {readString} = require('./ReadString');

unit.add(module, [
  function test_reject_events(t) {
    const async = t.startAsync('test_reject_events');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser(), reject({filter: stack => stack[0] % 2})]),
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
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_pick_objects(t) {
    const async = t.startAsync('test_pick_objects');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({packValues: true}), reject({filter: stack => stack[0] % 2}), streamArray()]),
      expected = [{a: {}}, null, {c: null}, null, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_pick_objects_string_filter(t) {
    const async = t.startAsync('test_pick_objects_string_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({packValues: true}), reject({filter: '1'}), streamArray()]),
      expected = [{a: {}}, null, {c: null}, {d: 1}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_pick_objects_regexp_filter(t) {
    const async = t.startAsync('test_pick_objects_regexp_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({packValues: true}), reject({filter: /\b[1-5]\.[a-d]\b/}), streamArray()]),
      expected = [{a: {}}, {b: null}, {c: null}, {d: null}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_pick_empty(t) {
    const async = t.startAsync('test_pick_empty');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({packValues: true}), reject({filter: stack => stack.length}), streamArray()]),
      expected = [null, null, null, null, null],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_pick_objects_once(t) {
    const async = t.startAsync('test_pick_objects_regexp_filter');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([readString(JSON.stringify(input)), parser({packValues: true}), reject({filter: /\b[1-5]\.[a-d]\b/, rejectOnce: true}), streamArray()]),
      expected = [{a: {}}, {b: null}, {c: null}, {d: 1}, {e: 'e'}],
      result = [];

    pipeline.on('data', chunk => result.push(chunk.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_pick_with_replacement(t) {
    const async = t.startAsync('test_pick_with_replacement');

    const input = [{a: {}}, {b: []}, {c: null}, {d: 1}, {e: 'e'}],
      pipeline = chain([
        readString(JSON.stringify(input)),
        parser({packValues: true}),
        reject({
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
  }
]);
