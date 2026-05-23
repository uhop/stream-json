// Mirror of tests/node/test-parser.js. See tests/web/test-stringer.js for the
// substrate-mirroring conventions.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import parser from '../../src/web/parser.js';
import Assembler from '../../src/web/assembler.js';

import {readWebString, drain} from '../web-helpers.js';

test.asPromise('parser (web): streaming values', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const pipeline = chain([readWebString(input), parser({packValues: false})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => ({name: chunk.name, val: chunk.value}));
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
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): packing values', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"]}';
    const pipeline = chain([readWebString(input), parser()]);
    const out = await drain(pipeline);
    const result = out.map(chunk => ({name: chunk.name, val: chunk.value}));
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
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): packing no streaming values', async (t, resolve, reject) => {
  try {
    const input = '{"a": 1, "b": true, "c": ["d"], "e": -2, "f": 0}';
    const pipeline = chain([readWebString(input), parser({streamValues: false})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => ({name: chunk.name, val: chunk.value}));
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
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): escaped', async (t, resolve, reject) => {
  try {
    const object = {
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [1, 2, true, 'tabs?\t\t\t', false]
    };
    const input = JSON.stringify(object);
    const pipeline = chain([readWebString(input), parser()]);
    const asm = Assembler.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, object);
    resolve();
  } catch (e) {
    reject(e);
  }
});

const survivesRoundtrip = object => async (t, resolve, reject) => {
  try {
    const input = JSON.stringify(object);
    const pipeline = chain([readWebString(input), parser()]);
    const asm = Assembler.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, object);
    resolve();
  } catch (e) {
    reject(e);
  }
};

test.asPromise('parser (web): survives roundtrip - true', survivesRoundtrip(true));
test.asPromise('parser (web): survives roundtrip - false', survivesRoundtrip(false));
test.asPromise('parser (web): survives roundtrip - null', survivesRoundtrip(null));
test.asPromise('parser (web): survives roundtrip - 0', survivesRoundtrip(0));
test.asPromise('parser (web): survives roundtrip - -1', survivesRoundtrip(-1));
test.asPromise('parser (web): survives roundtrip - 1.5', survivesRoundtrip(1.5));
test.asPromise('parser (web): survives roundtrip - 1.5e-12', survivesRoundtrip(1.5e-12));
test.asPromise('parser (web): survives roundtrip - 1.5e33', survivesRoundtrip(1.5e33));
test.asPromise('parser (web): survives roundtrip - string', survivesRoundtrip('hi'));
test.asPromise('parser (web): survives roundtrip - empty object', survivesRoundtrip({}));
test.asPromise('parser (web): survives roundtrip - empty array', survivesRoundtrip([]));
test.asPromise('parser (web): survives roundtrip - object', survivesRoundtrip({a: 1, b: true, c: 'd'}));
test.asPromise('parser (web): survives roundtrip - array', survivesRoundtrip([1, 2, true, 'd', false]));

const runSlidingWindowTest = quant => async (t, resolve, reject) => {
  try {
    const object = {
      stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
      anArray: [1, 2, true, 'tabs?\t\t\t', false]
    };
    const input = JSON.stringify(object);
    const pipeline = chain([readWebString(input, quant), parser()]);
    const asm = Assembler.connectTo(pipeline.readable);
    await new Promise(r => setTimeout(r, 30));
    t.deepEqual(asm.current, object);
    resolve();
  } catch (e) {
    reject(e);
  }
};

test.asPromise('parser (web): sliding window - 1', runSlidingWindowTest(1));
test.asPromise('parser (web): sliding window - 2', runSlidingWindowTest(2));
test.asPromise('parser (web): sliding window - 3', runSlidingWindowTest(3));
test.asPromise('parser (web): sliding window - 4', runSlidingWindowTest(4));
test.asPromise('parser (web): sliding window - 5', runSlidingWindowTest(5));
test.asPromise('parser (web): sliding window - 6', runSlidingWindowTest(6));
test.asPromise('parser (web): sliding window - 7', runSlidingWindowTest(7));
test.asPromise('parser (web): sliding window - 8', runSlidingWindowTest(8));
test.asPromise('parser (web): sliding window - 9', runSlidingWindowTest(9));
test.asPromise('parser (web): sliding window - 10', runSlidingWindowTest(10));
test.asPromise('parser (web): sliding window - 11', runSlidingWindowTest(11));
test.asPromise('parser (web): sliding window - 12', runSlidingWindowTest(12));
test.asPromise('parser (web): sliding window - 13', runSlidingWindowTest(13));

const runJsonStreamingTest =
  (len, sep = '') =>
  async (t, resolve, reject) => {
    try {
      const objects = [];
      for (let n = 0; n < len; n += 1) {
        objects.push({
          stringWithTabsAndNewlines: "Did it work?\nNo...\t\tI don't think so...",
          anArray: [n + 1, n + 2, true, 'tabs?\t\t\t', false],
          n
        });
      }

      const json = [];
      for (let n = 0; n < objects.length; n += 1) {
        json.push(JSON.stringify(objects[n]));
      }

      const input = json.join(sep);
      const pipeline = chain([readWebString(input, 4), parser({jsonStreaming: true})]);
      Assembler.connectTo(pipeline.readable, {
        onDone: asm => {
          const {current: obj} = asm;
          const {n} = obj;
          t.deepEqual(obj, objects[n]);
        }
      });
      await new Promise(r => setTimeout(r, 30));
      resolve();
    } catch (e) {
      reject(e);
    }
  };

test.asPromise('parser (web): json streaming - 1', runJsonStreamingTest(1, ''));
test.asPromise('parser (web): json streaming - 5', runJsonStreamingTest(5, ''));
test.asPromise('parser (web): json streaming - 5 with space', runJsonStreamingTest(5, ' '));
test.asPromise('parser (web): json streaming - 5 with newline', runJsonStreamingTest(5, '\n'));

test.asPromise('parser (web): error #1', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{'), parser()]);
    try {
      await drain(pipeline);
      t.fail();
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): error #2', async (t, resolve, reject) => {
  try {
    const pipeline = chain([readWebString('{"x":1]'), parser()]);
    try {
      await drain(pipeline);
      t.fail();
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): infinite fail', async (t, resolve, reject) => {
  try {
    const sample = '{"key1":1}garbage{"key3":2}';
    let pulls = 0;
    const infinite = new ReadableStream({
      pull(controller) {
        if (++pulls > 1000) {
          controller.close();
          return;
        }
        controller.enqueue(sample);
      }
    });
    const pipeline = chain([infinite, parser({jsonStreaming: true, packValues: true, streamValues: false})]);
    try {
      await drain(pipeline);
      t.fail();
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): empty stream', async (t, resolve, reject) => {
  try {
    const result = [];
    const pipeline = chain([readWebString(''), parser({packValues: false, jsonStreaming: true}), token => result.push({...token})]);
    await drain(pipeline);
    t.equal(result.length, 0);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): issue #167 - zero byte', async (t, resolve, reject) => {
  try {
    const input = `["a\x00a"]`;
    const pipeline = chain([readWebString(input), parser()]);
    try {
      await drain(pipeline);
      t.fail();
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): issue #167 - newline', async (t, resolve, reject) => {
  try {
    const input = `["a\na"]`;
    const pipeline = chain([readWebString(input), parser()]);
    try {
      await drain(pipeline);
      t.fail();
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): issue #167 - tab', async (t, resolve, reject) => {
  try {
    const input = `["a\ta"]`;
    const pipeline = chain([readWebString(input), parser()]);
    try {
      await drain(pipeline);
      t.fail();
      return reject();
    } catch (e) {
      t.ok(e);
      resolve();
    }
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): jsonStreaming adjacent number then array', async (t, resolve, reject) => {
  try {
    const input = '123[4]';
    const results = [];
    const pipeline = chain([readWebString(input), parser({jsonStreaming: true})]);
    Assembler.connectTo(pipeline.readable, {onDone: asm => results.push(asm.current)});
    await new Promise(r => setTimeout(r, 30));
    t.equal(results.length, 2);
    t.equal(results[0], 123);
    t.deepEqual(results[1], [4]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): jsonStreaming adjacent number then object', async (t, resolve, reject) => {
  try {
    const input = '42{"a":1}';
    const results = [];
    const pipeline = chain([readWebString(input), parser({jsonStreaming: true})]);
    Assembler.connectTo(pipeline.readable, {onDone: asm => results.push(asm.current)});
    await new Promise(r => setTimeout(r, 30));
    t.equal(results.length, 2);
    t.equal(results[0], 42);
    t.deepEqual(results[1], {a: 1});
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): jsonStreaming adjacent number then string', async (t, resolve, reject) => {
  try {
    const input = '99"hello"';
    const results = [];
    const pipeline = chain([readWebString(input), parser({jsonStreaming: true})]);
    Assembler.connectTo(pipeline.readable, {onDone: asm => results.push(asm.current)});
    await new Promise(r => setTimeout(r, 30));
    t.equal(results.length, 2);
    t.equal(results[0], 99);
    t.equal(results[1], 'hello');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): jsonStreaming adjacent number then true', async (t, resolve, reject) => {
  try {
    const input = '7true';
    const results = [];
    const pipeline = chain([readWebString(input, 2), parser({jsonStreaming: true})]);
    Assembler.connectTo(pipeline.readable, {onDone: asm => results.push(asm.current)});
    await new Promise(r => setTimeout(r, 30));
    t.equal(results.length, 2);
    t.equal(results[0], 7);
    t.equal(results[1], true);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): jsonStreaming number tokens for adjacent values', async (t, resolve, reject) => {
  try {
    const input = '123[4]';
    const pipeline = chain([readWebString(input), parser({jsonStreaming: true, streamValues: false})]);
    const out = await drain(pipeline);
    const result = out.map(chunk => ({name: chunk.name, val: chunk.value}));
    t.equal(result[0].name, 'numberValue');
    t.equal(result[0].val, '123');
    t.equal(result[1].name, 'startArray');
    t.equal(result[2].name, 'numberValue');
    t.equal(result[2].val, '4');
    t.equal(result[3].name, 'endArray');
    resolve();
  } catch (e) {
    reject(e);
  }
});
