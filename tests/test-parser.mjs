'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import Assembler from '../src/assembler.js';

import readString from './read-string.mjs';

test.asPromise('parser: streaming values', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"]}',
    pipeline = chain([readString(input), parser({packValues: false})]),
    result = [];

  pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
  pipeline.on('error', () => reject());
  pipeline.on('end', () => {
    t.ok(result.length === 20);
    t.equal(result[0].name, 'startObject');
    t.equal(result[1].name, 'startKey');
    t.equal(result[2].name, 'stringChunk');
    t.equal(result[2].val, 'a');
    t.equal(result[3].name, 'endKey');
    t.equal(result[4].name, 'startNumber');
    t.equal(result[5].name, 'numberChunk');
    t.equal(result[5].val, '1');
    t.equal(result[6].name, 'endNumber');
    t.equal(result[7].name, 'startKey');
    t.equal(result[8].name, 'stringChunk');
    t.equal(result[8].val, 'b');
    t.equal(result[9].name, 'endKey');
    t.equal(result[10].name, 'trueValue');
    t.equal(result[10].val, true);
    t.equal(result[11].name, 'startKey');
    t.equal(result[12].name, 'stringChunk');
    t.equal(result[12].val, 'c');
    t.equal(result[13].name, 'endKey');
    t.equal(result[14].name, 'startArray');
    t.equal(result[15].name, 'startString');
    t.equal(result[16].name, 'stringChunk');
    t.equal(result[16].val, 'd');
    t.equal(result[17].name, 'endString');
    t.equal(result[18].name, 'endArray');
    t.equal(result[19].name, 'endObject');
    resolve();
  });
});

test.asPromise('parser: packing values', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"]}',
    pipeline = chain([readString(input), parser()]),
    result = [];

  pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
  pipeline.on('error', () => reject());
  pipeline.on('end', () => {
    t.equal(result.length, 25);
    t.equal(result[0].name, 'startObject');
    t.equal(result[1].name, 'startKey');
    t.equal(result[2].name, 'stringChunk');
    t.equal(result[2].val, 'a');
    t.equal(result[3].name, 'endKey');
    t.equal(result[4].name, 'keyValue');
    t.equal(result[4].val, 'a');
    t.equal(result[5].name, 'startNumber');
    t.equal(result[6].name, 'numberChunk');
    t.equal(result[6].val, '1');
    t.equal(result[7].name, 'endNumber');
    t.equal(result[8].name, 'numberValue');
    t.equal(result[8].val, '1');
    t.equal(result[9].name, 'startKey');
    t.equal(result[10].name, 'stringChunk');
    t.equal(result[10].val, 'b');
    t.equal(result[11].name, 'endKey');
    t.equal(result[12].name, 'keyValue');
    t.equal(result[12].val, 'b');
    t.equal(result[13].name, 'trueValue');
    t.equal(result[13].val, true);
    t.equal(result[14].name, 'startKey');
    t.equal(result[15].name, 'stringChunk');
    t.equal(result[15].val, 'c');
    t.equal(result[16].name, 'endKey');
    t.equal(result[17].name, 'keyValue');
    t.equal(result[17].val, 'c');
    t.equal(result[18].name, 'startArray');
    t.equal(result[19].name, 'startString');
    t.equal(result[20].name, 'stringChunk');
    t.equal(result[20].val, 'd');
    t.equal(result[21].name, 'endString');
    t.equal(result[22].name, 'stringValue');
    t.equal(result[22].val, 'd');
    t.equal(result[23].name, 'endArray');
    t.equal(result[24].name, 'endObject');
    resolve();
  });
});

test.asPromise('parser: packing no streaming values', (t, resolve, reject) => {
  const input = '{"a": 1, "b": true, "c": ["d"], "e": -2, "f": 0}',
    pipeline = chain([readString(input), parser({streamValues: false})]),
    result = [];

  pipeline.on('data', chunk => result.push({name: chunk.name, val: chunk.value}));
  pipeline.on('error', () => reject());
  pipeline.on('end', () => {
    t.equal(result.length, 14);
    t.equal(result[0].name, 'startObject');
    t.equal(result[1].name, 'keyValue');
    t.equal(result[1].val, 'a');
    t.equal(result[2].name, 'numberValue');
    t.equal(result[2].val, '1');
    t.equal(result[3].name, 'keyValue');
    t.equal(result[3].val, 'b');
    t.equal(result[4].name, 'trueValue');
    t.equal(result[4].val, true);
    t.equal(result[5].name, 'keyValue');
    t.equal(result[5].val, 'c');
    t.equal(result[6].name, 'startArray');
    t.equal(result[7].name, 'stringValue');
    t.equal(result[7].val, 'd');
    t.equal(result[8].name, 'endArray');
    t.equal(result[9].name, 'keyValue');
    t.equal(result[9].val, 'e');
    t.equal(result[10].name, 'numberValue');
    t.equal(result[10].val, '-2');
    t.equal(result[11].name, 'keyValue');
    t.equal(result[11].val, 'f');
    t.equal(result[12].name, 'numberValue');
    t.equal(result[12].val, '0');
    t.equal(result[13].name, 'endObject');
    resolve();
  });
});

test.asPromise('parser: escaped', (t, resolve, reject) => {
  const object = {
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [1, 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false]
    },
    input = JSON.stringify(object),
    pipeline = readString(input).pipe(parser.asStream()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, object);
    resolve();
  });
});

const survivesRoundtrip = object => (t, resolve, reject) => {
  const input = JSON.stringify(object),
    pipeline = readString(input).pipe(parser.asStream()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, object);
    resolve();
  });
};

test.asPromise('parser: survives roundtrip - true', survivesRoundtrip(true));
test.asPromise('parser: survives roundtrip - false', survivesRoundtrip(false));
test.asPromise('parser: survives roundtrip - null', survivesRoundtrip(null));
test.asPromise('parser: survives roundtrip - 0', survivesRoundtrip(0));
test.asPromise('parser: survives roundtrip - -1', survivesRoundtrip(-1));
test.asPromise('parser: survives roundtrip - 1.5', survivesRoundtrip(1.5));
test.asPromise('parser: survives roundtrip - 1.5e-12', survivesRoundtrip(1.5e-12));
test.asPromise('parser: survives roundtrip - 1.5e33', survivesRoundtrip(1.5e33));
test.asPromise('parser: survives roundtrip - string', survivesRoundtrip('hi'));
test.asPromise('parser: survives roundtrip - empty object', survivesRoundtrip({}));
test.asPromise('parser: survives roundtrip - empty array', survivesRoundtrip([]));
test.asPromise('parser: survives roundtrip - object', survivesRoundtrip({a: 1, b: true, c: 'd'}));
test.asPromise('parser: survives roundtrip - array', survivesRoundtrip([1, 2, true, 'd', false]));

const runSlidingWindowTest = quant => (t, resolve, reject) => {
  const object = {
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [1, 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false]
    },
    input = JSON.stringify(object),
    pipeline = readString(input, quant).pipe(parser.asStream()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, object);
    resolve();
  });
};

test.asPromise('parser: sliding window - 1', runSlidingWindowTest(1));
test.asPromise('parser: sliding window - 2', runSlidingWindowTest(2));
test.asPromise('parser: sliding window - 3', runSlidingWindowTest(3));
test.asPromise('parser: sliding window - 4', runSlidingWindowTest(4));
test.asPromise('parser: sliding window - 5', runSlidingWindowTest(5));
test.asPromise('parser: sliding window - 6', runSlidingWindowTest(6));
test.asPromise('parser: sliding window - 7', runSlidingWindowTest(7));
test.asPromise('parser: sliding window - 8', runSlidingWindowTest(8));
test.asPromise('parser: sliding window - 9', runSlidingWindowTest(9));
test.asPromise('parser: sliding window - 10', runSlidingWindowTest(10));
test.asPromise('parser: sliding window - 11', runSlidingWindowTest(11));
test.asPromise('parser: sliding window - 12', runSlidingWindowTest(12));
test.asPromise('parser: sliding window - 13', runSlidingWindowTest(13));

const runJsonStreamingTest =
  (len, sep = '') =>
  (t, resolve, reject) => {
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
    const pipeline = readString(input, 4).pipe(parser.asStream({jsonStreaming: true}));
    const assembler = Assembler.connectTo(pipeline);

    assembler.on('done', asm => {
      const {current: obj} = asm;
      const {n} = obj;
      t.deepEqual(obj, objects[n]);
    });

    pipeline.on('error', reject);
    pipeline.on('end', resolve);
  };

test.asPromise('parser: json streaming - 1', runJsonStreamingTest(1, ''));
test.asPromise('parser: json streaming - 5', runJsonStreamingTest(5, ''));
test.asPromise('parser: json streaming - 5 with space', runJsonStreamingTest(5, ' '));
test.asPromise('parser: json streaming - 5 with newline', runJsonStreamingTest(5, '\n'));

test.asPromise('parser: error #1', (t, resolve, reject) => {
  const stream = parser.asStream();

  stream.on('error', resolve);
  stream.on('end', () => {
    t.fail();
    reject();
  });

  readString('{').pipe(stream);
});

test.asPromise('parser: error #2', (t, resolve, reject) => {
  const stream = chain([readString('{"x":1]'), parser()]);

  stream.on('error', resolve);
  stream.on('end', () => {
    t.fail();
    reject();
  });
});

test.asPromise('parser: infinite fail', (t, resolve, reject) => {
  const sample = '{"key1":1}garbage{"key3":2}',
    pipeline = chain([
      function* () {
        while (true) yield sample;
      },
      parser({jsonStreaming: true, packValues: true, streamValues: false})
    ]);

  pipeline.on('error', resolve);
  pipeline.on('end', () => {
    t.fail();
    reject();
  });

  pipeline.end(1);
});

test.asPromise('parser: empty stream', (t, resolve, reject) => {
  const input = '',
    result = [],
    pipeline = chain([
      readString(input),
      parser({packValues: false, jsonStreaming: true}),
      token => result.push({...token})
    ]);

  pipeline.on('error', reject);
  pipeline.on('end', function () {
    t.equal(result.length, 0);
    resolve();
  });

  pipeline.resume();
});

test.asPromise('parser: issue #167 - zero byte', (t, resolve, reject) => {
  const input = `["a\x00a"]`,
    pipeline = chain([
      readString(input),
      parser()
    ]);

  pipeline.on('error', resolve);
  pipeline.on('end', reject);
});

test.asPromise('parser: issue #167 - newline', (t, resolve, reject) => {
  const input = `["a\na"]`,
    pipeline = chain([
      readString(input),
      parser()
    ]);

  pipeline.on('error', resolve);
  pipeline.on('end', reject);
});

test.asPromise('parser: issue #167 - tab', (t, resolve, reject) => {
  const input = `["a\ta"]`,
    pipeline = chain([
      readString(input),
      parser()
    ]);

  pipeline.on('error', resolve);
  pipeline.on('end', reject);
});
