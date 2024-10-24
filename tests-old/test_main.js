'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const makeParser = require('../index');
const Counter = require('./Counter');

unit.add(module, [
  function test_main(t) {
    const async = t.startAsync('test_source');

    const plainCounter = new Counter(),
      streamCounter = new Counter(),
      parser = makeParser();

    parser.on('startObject', () => ++streamCounter.objects);
    parser.on('keyValue', () => ++streamCounter.keys);
    parser.on('startArray', () => ++streamCounter.arrays);
    parser.on('nullValue', () => ++streamCounter.nulls);
    parser.on('trueValue', () => ++streamCounter.trues);
    parser.on('falseValue', () => ++streamCounter.falses);
    parser.on('numberValue', () => ++streamCounter.numbers);
    parser.on('stringValue', () => ++streamCounter.strings);

    parser.on('end', () => {
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
          .pipe(parser);
      });
    });
  }
]);
