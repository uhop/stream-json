'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const ReadString = require('./ReadString');
const makeParser = require('../index');
const Assembler = require('../Assembler');

unit.add(module, [
  function test_assembler(t) {
    const async = t.startAsync('test_assembler');

    let object = null;
    const parser = makeParser(),
      assembler = Assembler.connectTo(parser);

    parser.on('end', () => {
      eval(t.TEST('t.unify(assembler.current, object)'));
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

        object = JSON.parse(data.toString());

        fs.createReadStream(path.resolve(__dirname, './sample.json.gz'))
          .pipe(zlib.createGunzip())
          .pipe(parser);
      });
    });
  },
  function test_assembler_no_streaming(t) {
    const async = t.startAsync('test_assembler_no_streaming');

    let object = null;
    const parser = makeParser({streamValues: false}),
      assembler = Assembler.connectTo(parser);

    parser.on('end', () => {
      eval(t.TEST('t.unify(assembler.current, object)'));
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

        object = JSON.parse(data.toString());

        fs.createReadStream(path.resolve(__dirname, './sample.json.gz'))
          .pipe(zlib.createGunzip())
          .pipe(parser);
      });
    });
  },
  function test_assembler_json_objects(t) {
    const async = t.startAsync('test_stringer_json_stream_primitives');

    const parser = makeParser({jsonStreaming: true}),
      assembler = Assembler.connectTo(parser),
      pattern = [1, 2, "zzz", "z'z\"z", null, true, false, 1, [], null, {}, true, {"a": "b"}],
      result = [];

    assembler.on('done', asm => result.push(asm.current));
    parser.on('end', () => {
      eval(t.TEST('t.unify(result, pattern)'));
      async.done();
    });

    new ReadString(pattern.map(value => JSON.stringify(value)).join(' ')).pipe(parser);
  }
]);
