'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib'),
  {Writable, Transform} = require('stream');

const {parser} = require('../jsonl/Parser');
const {stringer} = require('../jsonl/Stringer');

const {readString} = require('./ReadString');

const roundtrip = (t, len, quant) => {
  const async = t.startAsync(`test_jsonl_parser: len = ${len} quant = ${quant || ''}`);

  const objects = [];
  for (let n = 0; n < len; n += 1) {
    objects.push({
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [n + 1, n + 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false],
      n
    });
  }

  const json = [];
  for (let n = 0; n < objects.length; n += 1) {
    json.push(JSON.stringify(objects[n]));
  }

  const input = json.join('\n'),
    result = [];
  readString(input, quant)
    .pipe(parser())
    .pipe(
      new Writable({
        objectMode: true,
        write(chunk, _, callback) {
          result.push(chunk.value);
          callback(null);
        },
        final(callback) {
          eval(t.TEST('t.unify(objects, result)'));
          async.done();
          callback(null);
        }
      })
    );
};

unit.add(module, [
  function test_jsonl_parser(t) {
    roundtrip(t);
  },
  function test_jsonl_parser1(t) {
    roundtrip(t, 1);
  },
  function test_jsonl_parser2(t) {
    roundtrip(t, 2);
  },
  function test_jsonl_parser3(t) {
    roundtrip(t, 3);
  },
  function test_jsonl_parser4(t) {
    roundtrip(t, 4);
  },
  function test_jsonl_parser5(t) {
    roundtrip(t, 5);
  },
  function test_jsonl_parser6(t) {
    roundtrip(t, 6);
  },
  function test_jsonl_parser7(t) {
    roundtrip(t, 7);
  },
  function test_jsonl_parser8(t) {
    roundtrip(t, 8);
  },
  function test_jsonl_parser9(t) {
    roundtrip(t, 9);
  },
  function test_jsonl_parser10(t) {
    roundtrip(t, 10);
  },
  function test_jsonl_parser11(t) {
    roundtrip(t, 11);
  },
  function test_jsonl_parser12(t) {
    roundtrip(t, 12);
  },
  function test_jsonl_parser_file(t) {
    const async = t.startAsync('test_jsonl_parser_file');

    let count = 0;
    fs.createReadStream(path.resolve(__dirname, './sample.jsonl.gz'))
      .pipe(zlib.createGunzip())
      .pipe(parser())
      .pipe(
        new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            eval(t.TEST('count === chunk.key'));
            ++count;
            callback(null);
          },
          final(callback) {
            eval(t.TEST('count === 100'));
            async.done();
            callback(null);
          }
        })
      );
  },
  function test_jsonl_stringer(t) {
    const async = t.startAsync('test_jsonl_stringer');
    const pattern = {
        a: [[[]]],
        b: {a: 1},
        c: {a: 1, b: 2},
        d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
        e: 1,
        f: '',
        g: true,
        h: false,
        i: null,
        j: [],
        k: {}
      },
      string = JSON.stringify(pattern);

    let buffer = '';
    readString(string)
      .pipe(parser())
      .pipe(
        new Transform({
          writableObjectMode: true,
          readableObjectMode: true,
          transform(chunk, _, callback) {
            this.push(chunk.value);
            callback(null);
          }
        })
      )
      .pipe(stringer())
      .pipe(
        new Writable({
          write(chunk, _, callback) {
            buffer += chunk;
            callback(null);
          },
          final(callback) {
            eval(t.TEST('t.unify(string, buffer)'));
            async.done();
            callback(null);
          }
        })
      );
  },
  function test_jsonl_stringer_multiple(t) {
    const async = t.startAsync('test_jsonl_stringer_multiple');
    const pattern = {
      a: [[[]]],
      b: {a: 1},
      c: {a: 1, b: 2},
      d: [true, 1, "'x\"y'", null, false, true, {}, [], ''],
      e: 1,
      f: '',
      g: true,
      h: false,
      i: null,
      j: [],
      k: {}
    };

    let string = JSON.stringify(pattern),
      buffer = '';
    string = string + '\n' + string + '\n' + string;

    readString(string + '\n')
      .pipe(parser())
      .pipe(
        new Transform({
          writableObjectMode: true,
          readableObjectMode: true,
          transform(chunk, _, callback) {
            this.push(chunk.value);
            callback(null);
          }
        })
      )
      .pipe(stringer())
      .pipe(
        new Writable({
          write(chunk, _, callback) {
            buffer += chunk;
            callback(null);
          },
          final(callback) {
            eval(t.TEST('t.unify(string, buffer)'));
            async.done();
            callback(null);
          }
        })
      );
  },
  function test_jsonl_invalid_json_end_fail(t) {
    const async = t.startAsync('test_jsonl_invalid_json_end_fail');

    const stream = parser({checkErrors: true});

    stream.on('error', err => {
      eval(t.TEST('err'));
      async.done();
    });
    stream.on('end', value => {
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    readString('{').pipe(stream);
  },
  function test_jsonl_invalid_json_middle_fail(t) {
    const async = t.startAsync('test_jsonl_invalid_json_middle_fail');

    const stream = parser({checkErrors: true});

    stream.on('error', err => {
      eval(t.TEST('err'));
      async.done();
    });
    stream.on('end', value => {
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    readString('{}\n]\n1').pipe(stream);
  },
]);
