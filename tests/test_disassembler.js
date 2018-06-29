'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const {chain} = require('stream-chain');

const ReadString = require('./ReadString');
const {parser} = require('../index');
const {pick} = require('../filters/Pick');
const {disassembler} = require('../Disassembler');
const {streamArray} = require('../streamers/StreamArray');
const {streamValues} = require('../streamers/StreamValues');

unit.add(module, [
  function test_assembler(t) {
    const async = t.startAsync('test_disassembler');

    const input = [1, 2, null, true, false, {}, [], {a: {b: {c: [{d: 1}]}}}, [[[]]]],
      result = [];

    const pipeline = chain([
      new ReadString(JSON.stringify(input)),
      parser(),
      streamArray(),
      disassembler(),
      pick({filter: 'value'}),
      streamValues()
    ]);

    pipeline.on('data', item => result.push(item.value));
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, input)'));
      async.done();
    });
  }
]);
