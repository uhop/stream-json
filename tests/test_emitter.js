'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const Parser = require('../Parser');
const Counter = require('./Counter');
const emit = require('../utils/emit');

unit.add(module, [
  function test_emitter(t) {
    const async = t.startAsync('test_emitter');

    const plainCounter = new Counter(),
      emitterCounter = new Counter(),
      parser = new Parser({packKeys: true, packStrings: true, packNumbers: true});
    emit(parser);

    parser.on('startObject', () => ++emitterCounter.objects);
    parser.on('keyValue', () => ++emitterCounter.keys);
    parser.on('startArray', () => ++emitterCounter.arrays);
    parser.on('nullValue', () => ++emitterCounter.nulls);
    parser.on('trueValue', () => ++emitterCounter.trues);
    parser.on('falseValue', () => ++emitterCounter.falses);
    parser.on('numberValue', () => ++emitterCounter.numbers);
    parser.on('stringValue', () => ++emitterCounter.strings);

    parser.on('finish', () => {
      eval(t.TEST('t.unify(plainCounter, emitterCounter)'));
      async.done();
    });

    fs.readFile(path.resolve(__dirname, './sample.json.gz'), (err, data) => {
      if (err) {
        throw err;
      }
      zlib.gunzip(data, (err, data) => {
        if (err) {
          throw err;
        }

        const o = JSON.parse(data);
        Counter.walk(o, plainCounter);

        fs.createReadStream(path.resolve(__dirname, './sample.json.gz'))
          .pipe(zlib.createGunzip())
          .pipe(parser);
      });
    });
  }
]);
