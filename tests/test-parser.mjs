'use strict';

import test from 'tape-six';
import chain from 'stream-chain';

import makeParser, {parser} from '../src/parser.js';
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

const survivesRoundtrip = object => (t, resolve, reject) => {
  const input = JSON.stringify(object),
    pipeline = readString(input).pipe(makeParser()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, object);
    resolve();
  });
};

const runSlidingWindowTest = quant => (t, resolve, reject) => {
  const object = {
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [1, 2, true, 'tabs?\t\t\t\u0001\u0002\u0003', false]
    },
    input = JSON.stringify(object),
    pipeline = readString(input, quant).pipe(makeParser()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, object);
    resolve();
  });
};

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
    const pipeline = readString(input, 4).pipe(makeParser({jsonStreaming: true}));
    const assembler = Assembler.connectTo(pipeline);

    assembler.on('done', asm => {
      const {current: obj} = asm;
      const {n} = obj;
      t.deepEqual(obj, objects[n]);
    });

    pipeline.on('error', reject);
    pipeline.on('end', resolve);
  };
