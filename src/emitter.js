// @ts-self-types="./emitter.d.ts"

'use strict';

const {Writable} = require('node:stream');

const emitter = options => {
  const stream = new Writable(
    Object.assign({}, options, {
      objectMode: true,
      write(chunk, _, callback) {
        stream.emit(chunk.name, chunk.value);
        callback(null);
      }
    })
  );
  return stream;
};

emitter.asStream = emitter;
emitter.emitter = emitter;

module.exports = emitter;
