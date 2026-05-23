import type {Duplex} from 'node:stream';

import test from 'tape-six';
import Assembler from '../../src/assembler.js';
import streamBase from '../../src/streamers/stream-base.js';
import streamArray from '../../src/streamers/stream-array.js';
import streamObject from '../../src/streamers/stream-object.js';
import streamValues from '../../src/streamers/stream-values.js';

test('types: streamBase options', t => {
  const opts: streamBase.StreamBaseOptions = {
    reviver: (k, v) => v,
    numberAsString: true,
    objectFilter: (asm: Assembler) => true,
    includeUndecided: false
  };
  t.ok(opts);
});

test('types: streamArray', t => {
  const fn = streamArray();
  t.equal(typeof fn, 'function');

  const fnOpts = streamArray({objectFilter: () => true});
  t.equal(typeof fnOpts, 'function');

  const item: streamArray.StreamArrayItem = {key: 0, value: 'hello'};
  t.equal(item.key, 0);

  const as: Duplex = streamArray.asStream();
  t.ok(as);

  const wp = streamArray.withParser();
  t.equal(typeof wp, 'function');

  const stream: Duplex = streamArray.withParserAsStream({objectFilter: () => null});
  t.ok(stream);
});

test('types: streamObject', t => {
  const fn = streamObject();
  t.equal(typeof fn, 'function');

  const fnOpts = streamObject({includeUndecided: true});
  t.equal(typeof fnOpts, 'function');

  const item: streamObject.StreamObjectItem = {key: 'name', value: 42};
  t.equal(item.key, 'name');

  const as: Duplex = streamObject.asStream();
  t.ok(as);

  const wp = streamObject.withParser();
  t.equal(typeof wp, 'function');

  const stream: Duplex = streamObject.withParserAsStream();
  t.ok(stream);
});

test('types: streamValues', t => {
  const fn = streamValues();
  t.equal(typeof fn, 'function');

  const fnOpts = streamValues({numberAsString: true});
  t.equal(typeof fnOpts, 'function');

  const item: streamValues.StreamValuesItem = {key: 0, value: {nested: true}};
  t.equal(item.key, 0);

  const as: Duplex = streamValues.asStream();
  t.ok(as);

  const wp = streamValues.withParser();
  t.equal(typeof wp, 'function');

  const stream: Duplex = streamValues.withParserAsStream();
  t.ok(stream);
});

test('types: generic streamer items', t => {
  interface Row {
    name: string;
    age: number;
  }

  const arrItem: streamArray.StreamArrayItem<Row> = {key: 0, value: {name: 'a', age: 1}};
  t.equal(arrItem.value.name, 'a');

  const objItem: streamObject.StreamObjectItem<Row> = {key: 'first', value: {name: 'b', age: 2}};
  t.equal(objItem.value.age, 2);

  const valItem: streamValues.StreamValuesItem<Row> = {key: 0, value: {name: 'c', age: 3}};
  t.equal(valItem.value.name, 'c');

  // Factories carry T through the .withParser static.
  const arrPipeline = streamArray.withParser<Row>();
  t.equal(typeof arrPipeline, 'function');

  const objPipeline = streamObject.withParser<Row>({objectFilter: () => true});
  t.equal(typeof objPipeline, 'function');
});
