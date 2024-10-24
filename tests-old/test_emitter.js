'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const Parser = require('../Parser');
const Emitter = require('../Emitter');
const Counter = require('./Counter');

unit.add(module, [
  function test_emitter(t) {
    const async = t.startAsync('test_emitter');

    const plainCounter = new Counter(),
      emitterCounter = new Counter(),
      parser = new Parser(),
      emitter = new Emitter();

    parser.pipe(emitter);

    emitter.on('startObject', () => ++emitterCounter.objects);
    emitter.on('keyValue', () => ++emitterCounter.keys);
    emitter.on('startArray', () => ++emitterCounter.arrays);
    emitter.on('nullValue', () => ++emitterCounter.nulls);
    emitter.on('trueValue', () => ++emitterCounter.trues);
    emitter.on('falseValue', () => ++emitterCounter.falses);
    emitter.on('numberValue', () => ++emitterCounter.numbers);
    emitter.on('stringValue', () => ++emitterCounter.strings);

    emitter.on('finish', () => {
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
