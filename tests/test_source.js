'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const makeSource = require('../main');
const Counter = require('./Counter');

unit.add(module, [
  function test_source(t) {
    const async = t.startAsync('test_source');

    const plainCounter = new Counter(),
      streamCounter = new Counter(),
      source = makeSource();

    source.on('startObject', () => ++streamCounter.objects);
    source.on('keyValue', () => ++streamCounter.keys);
    source.on('startArray', () => ++streamCounter.arrays);
    source.on('nullValue', () => ++streamCounter.nulls);
    source.on('trueValue', () => ++streamCounter.trues);
    source.on('falseValue', () => ++streamCounter.falses);
    source.on('numberValue', () => ++streamCounter.numbers);
    source.on('stringValue', () => ++streamCounter.strings);

    source.on('end', () => {
      eval(t.TEST('t.unify(plainCounter, streamCounter)'));
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
          .pipe(source.input);
      });
    });
  }
]);
