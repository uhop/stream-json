'use strict';

const unit = require('heya-unit');

const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const Parser = require('../Parser');
const Assembler = require('../Assembler');
const emit = require('../utils/emit');

const ReadString = require('./ReadString');
const Counter = require('./Counter');

const survivesRoundtrip = (t, object) => {
  const async = t.startAsync('survivesRoundtrip: ' + object);

  const input = JSON.stringify(object),
    pipeline = new ReadString(input).pipe(new Parser()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('end', () => {
    eval(t.TEST('t.unify(assembler.current, object)'));
    async.done();
  });
};

function runSlidingWindowTest(t, quant) {
  const async = t.startAsync('test_sliding: ' + quant);

  const object = {
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [1, 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false]
    },
    input = JSON.stringify(object),
    pipeline = new ReadString(input, quant).pipe(new Parser()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('end', () => {
    eval(t.TEST('t.unify(assembler.current, object)'));
    async.done();
  });
}

function runJsonStreamingTest(t, len, sep = '') {
  const async = t.startAsync(`test_json_streaming: len = ${len} sep = "${sep}"`);

  const objects = [];
  for (let n = 0; n < len; n += 1) {
    objects.push({
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [n + 1, n + 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false],
      n
    });
  }

  let json = [];
  for (let n = 0; n < objects.length; n += 1) {
    json.push(JSON.stringify(objects[n]));
  }

  const input = json.join(sep);
  const pipeline = new ReadString(input, 4).pipe(new Parser({ jsonStreaming: true }));
  const assembler = Assembler.connectTo(pipeline);

  assembler.on('done', (asm) => {
    const { current: obj } = asm;
    const { n } = obj;
    eval(t.TEST('t.unify(obj, objects[n])'));
  });

  pipeline.on('end', () => {
    async.done();
  });
}

unit.add(module, [
  function test_parser_streamer(t) {
    const async = t.startAsync('test_streamer');

    const input = '{"a": 1, "b": true, "c": ["d"]}',
      pipeline = ReadString.make(input).pipe(Parser.make({packValues: false})),
      result = [];

    pipeline.on('data', function(chunk) {
      result.push({name: chunk.name, val: chunk.value});
    });
    pipeline.on('end', function() {
      eval(t.ASSERT('result.length === 20'));
      eval(t.TEST("result[0].name === 'startObject'"));
      eval(t.TEST("result[1].name === 'startKey'"));
      eval(t.TEST("result[2].name === 'stringChunk' && result[2].val === 'a'"));
      eval(t.TEST("result[3].name === 'endKey'"));
      eval(t.TEST("result[4].name === 'startNumber'"));
      eval(t.TEST("result[5].name === 'numberChunk' && result[5].val === '1'"));
      eval(t.TEST("result[6].name === 'endNumber'"));
      eval(t.TEST("result[7].name === 'startKey'"));
      eval(t.TEST("result[8].name === 'stringChunk' && result[8].val === 'b'"));
      eval(t.TEST("result[9].name === 'endKey'"));
      eval(t.TEST("result[10].name === 'trueValue' && result[10].val === true"));
      eval(t.TEST("result[11].name === 'startKey'"));
      eval(t.TEST("result[12].name === 'stringChunk' && result[12].val === 'c'"));
      eval(t.TEST("result[13].name === 'endKey'"));
      eval(t.TEST("result[14].name === 'startArray'"));
      eval(t.TEST("result[15].name === 'startString'"));
      eval(t.TEST("result[16].name === 'stringChunk' && result[16].val === 'd'"));
      eval(t.TEST("result[17].name === 'endString'"));
      eval(t.TEST("result[18].name === 'endArray'"));
      eval(t.TEST("result[19].name === 'endObject'"));
      async.done();
    });
  },
  function test_parser_packer(t) {
    const async = t.startAsync('test_parser_packer');

    const input = '{"a": 1, "b": true, "c": ["d"]}',
      pipeline = new ReadString(input).pipe(new Parser()),
      result = [];

    pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
    pipeline.on('end', () => {
      eval(t.ASSERT('result.length === 25'));
      eval(t.TEST("result[0].name === 'startObject'"));
      eval(t.TEST("result[1].name === 'startKey'"));
      eval(t.TEST("result[2].name === 'stringChunk' && result[2].val === 'a'"));
      eval(t.TEST("result[3].name === 'endKey'"));
      eval(t.TEST("result[4].name === 'keyValue' && result[4].val === 'a'"));
      eval(t.TEST("result[5].name === 'startNumber'"));
      eval(t.TEST("result[6].name === 'numberChunk' && result[6].val === '1'"));
      eval(t.TEST("result[7].name === 'endNumber'"));
      eval(t.TEST("result[8].name === 'numberValue' && result[8].val === '1'"));
      eval(t.TEST("result[9].name === 'startKey'"));
      eval(t.TEST("result[10].name === 'stringChunk' && result[10].val === 'b'"));
      eval(t.TEST("result[11].name === 'endKey'"));
      eval(t.TEST("result[12].name === 'keyValue' && result[12].val === 'b'"));
      eval(t.TEST("result[13].name === 'trueValue' && result[13].val === true"));
      eval(t.TEST("result[14].name === 'startKey'"));
      eval(t.TEST("result[15].name === 'stringChunk' && result[15].val === 'c'"));
      eval(t.TEST("result[16].name === 'endKey'"));
      eval(t.TEST("result[17].name === 'keyValue' && result[17].val === 'c'"));
      eval(t.TEST("result[18].name === 'startArray'"));
      eval(t.TEST("result[19].name === 'startString'"));
      eval(t.TEST("result[20].name === 'stringChunk' && result[20].val === 'd'"));
      eval(t.TEST("result[21].name === 'endString'"));
      eval(t.TEST("result[22].name === 'stringValue' && result[22].val === 'd'"));
      eval(t.TEST("result[23].name === 'endArray'"));
      eval(t.TEST("result[24].name === 'endObject'"));
      async.done();
    });
  },
  function test_parser_packer_no_streamed_values(t) {
    const async = t.startAsync('test_parser_packer_no_streamed_values');

    const input = '{"a": 1, "b": true, "c": ["d"], "e": -2, "f": 0}',
      pipeline = new ReadString(input).pipe(new Parser({streamValues: false})),
      result = [];

    pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
    pipeline.on('end', () => {
      eval(t.ASSERT('result.length === 14'));
      eval(t.TEST("result[0].name === 'startObject'"));
      eval(t.TEST("result[1].name === 'keyValue' && result[1].val === 'a'"));
      eval(t.TEST("result[2].name === 'numberValue' && result[2].val === '1'"));
      eval(t.TEST("result[3].name === 'keyValue' && result[3].val === 'b'"));
      eval(t.TEST("result[4].name === 'trueValue' && result[4].val === true"));
      eval(t.TEST("result[5].name === 'keyValue' && result[5].val === 'c'"));
      eval(t.TEST("result[6].name === 'startArray'"));
      eval(t.TEST("result[7].name === 'stringValue' && result[7].val === 'd'"));
      eval(t.TEST("result[8].name === 'endArray'"));
      eval(t.TEST("result[9].name === 'keyValue' && result[9].val === 'e'"));
      eval(t.TEST("result[10].name === 'numberValue' && result[10].val === '-2'"));
      eval(t.TEST("result[11].name === 'keyValue' && result[11].val === 'f'"));
      eval(t.TEST("result[12].name === 'numberValue' && result[12].val === '0'"));
      eval(t.TEST("result[13].name === 'endObject'"));
      async.done();
    });
  },
  function test_parser_emitter(t) {
    const async = t.startAsync('test_parser_emitter');

    const plainCounter = new Counter(),
      emitterCounter = new Counter(),
      parser = emit(new Parser({streamValues: false}));

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
  },
  function test_parser_escaped(t) {
    const async = t.startAsync('test_escaped');

    const object = {
        stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
        anArray: [1, 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false]
      },
      input = JSON.stringify(object),
      pipeline = new ReadString(input).pipe(new Parser()),
      assembler = Assembler.connectTo(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(assembler.current, object)'));
      async.done();
    });
  },
  function test_parser_primitives_true(t) {
    survivesRoundtrip(t, true);
  },
  function test_parser_primitives_false(t) {
    survivesRoundtrip(t, false);
  },
  function test_parser_primitives_null(t) {
    survivesRoundtrip(t, null);
  },
  function test_parser_primitives_number1(t) {
    survivesRoundtrip(t, 0);
  },
  function test_parser_primitives_number2(t) {
    survivesRoundtrip(t, -1);
  },
  function test_parser_primitives_number3(t) {
    survivesRoundtrip(t, 1.5);
  },
  function test_parser_primitives_number4(t) {
    survivesRoundtrip(t, 1.5e-12);
  },
  function test_parser_primitives_number5(t) {
    survivesRoundtrip(t, 1.5e33);
  },
  function test_parser_primitives_string(t) {
    survivesRoundtrip(t, 'string');
  },
  function test_parser_primitives_empty_object(t) {
    survivesRoundtrip(t, {});
  },
  function test_parser_primitives_empty_array(t) {
    survivesRoundtrip(t, []);
  },
  function test_parser_sliding_1(t) {
    runSlidingWindowTest(t, 1);
  },
  function test_parser_sliding_2(t) {
    runSlidingWindowTest(t, 2);
  },
  function test_parser_sliding_3(t) {
    runSlidingWindowTest(t, 3);
  },
  function test_parser_sliding_4(t) {
    runSlidingWindowTest(t, 4);
  },
  function test_parser_sliding_5(t) {
    runSlidingWindowTest(t, 5);
  },
  function test_parser_sliding_6(t) {
    runSlidingWindowTest(t, 6);
  },
  function test_parser_sliding_7(t) {
    runSlidingWindowTest(t, 7);
  },
  function test_parser_sliding_8(t) {
    runSlidingWindowTest(t, 8);
  },
  function test_parser_sliding_9(t) {
    runSlidingWindowTest(t, 9);
  },
  function test_parser_sliding_10(t) {
    runSlidingWindowTest(t, 10);
  },
  function test_parser_sliding_11(t) {
    runSlidingWindowTest(t, 11);
  },
  function test_parser_sliding_12(t) {
    runSlidingWindowTest(t, 12);
  },
  function test_parser_json_streaming_1(t) {
    runJsonStreamingTest(t, 1, '');
  },
  function test_parser_json_streaming_5(t) {
    runJsonStreamingTest(t, 5, '');
  },
  function test_parser_json_streaming_5s(t) {
    runJsonStreamingTest(t, 5, ' ');
  },
  function test_parser_json_streaming_5lf(t) {
    runJsonStreamingTest(t, 5, '\n');
  },
  function test_parser_fail(t) {
    const async = t.startAsync('test_parser_fail');

    const stream = new Parser();

    stream.on('error', err => {
      eval(t.TEST('err'));
      async.done();
    });
    stream.on('end', value => {
      eval(t.TEST("!'We shouldn't be here.'"));
      async.done();
    });

    new ReadString('{').pipe(stream);
  }
]);
