'use strict';

// Pure + Web-Streams test helpers. Importing this file must not pull `node:*`
// — these helpers are reused by browser tests via `tape-six-playwright`.

export const delay =
  (fn, ms = 20) =>
  (...args) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(fn(...args));
        } catch (error) {
          reject(error);
        }
      }, ms);
    });

export const webStreamToArray = array =>
  new WritableStream({
    write(chunk) {
      array.push(chunk);
    }
  });

// Feed values into a TransformStream's writable, close it, drain the readable,
// return the collected output. Mirrors the Node-side `stream.write(...); stream.end()`
// + `stream.on('data', …)` pattern in a substrate-agnostic shape.
export const writeAndCollect = async (transform, values) => {
  const writer = transform.writable.getWriter();
  const reader = transform.readable.getReader();
  const out = [];
  const readP = (async () => {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      out.push(value);
    }
  })();
  const writeP = (async () => {
    for (const v of values) await writer.write(v);
    await writer.close();
  })();
  await Promise.all([writeP, readP]);
  return out;
};

// Feed a single string (or sequence of string chunks) through a parser-style
// TransformStream pair; collect token objects. The web-side equivalent of
// `chain([readString(input), parser({...})])` + on('data') drain.
export const parseString = async (transform, input, {quant} = {}) => {
  const chunks =
    quant && input.length > quant ? Array.from({length: Math.ceil(input.length / quant)}, (_, i) => input.slice(i * quant, (i + 1) * quant)) : [input];
  return writeAndCollect(transform, chunks);
};

// Build a web chain from a list of TransformStream pairs (each `{readable, writable}`),
// feed it the given inputs (an iterable), and collect outputs. Mirrors the Node-side
// `chain([readString(input), ...stages])` + `on('data')` drain shape, but routes
// through `pipeThrough` to keep the dependency on `stream-chain/web` out of helpers.
export const runWebChain = async (transforms, inputs) => {
  if (!transforms.length) throw new Error('runWebChain: need at least one transform');
  const head = transforms[0];
  const tailReadable = transforms.slice(1).reduce((readable, t) => readable.pipeThrough(t), head.readable);
  const writer = head.writable.getWriter();
  const reader = tailReadable.getReader();
  const out = [];
  const readP = (async () => {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      out.push(value);
    }
  })();
  const writeP = (async () => {
    for (const v of inputs) await writer.write(v);
    await writer.close();
  })();
  await Promise.all([writeP, readP]);
  return out;
};

// Pure JS object-walker used by emitter / main tests. No streams involved,
// browser-safe by construction.
export class Counter {
  constructor() {
    this.objects = this.keys = this.arrays = this.nulls = this.trues = this.falses = this.numbers = this.strings = 0;
  }
  static walk(o, counter) {
    switch (typeof o) {
      case 'string':
        ++counter.strings;
        return;
      case 'number':
        ++counter.numbers;
        return;
      case 'boolean':
        if (o) {
          ++counter.trues;
        } else {
          ++counter.falses;
        }
        return;
    }
    if (o === null) {
      ++counter.nulls;
      return;
    }
    if (o instanceof Array) {
      ++counter.arrays;
      o.forEach(function (o) {
        Counter.walk(o, counter);
      });
      return;
    }
    ++counter.objects;
    for (let key in o) {
      if (o.hasOwnProperty(key)) {
        ++counter.keys;
        Counter.walk(o[key], counter);
      }
    }
  }
}

export default Counter;
