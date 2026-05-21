// @ts-self-types="./emitter.d.ts"

import {Writable} from 'node:stream';

const emitter = options => {
  const stream = new Writable({
    ...options,
    objectMode: true,
    write(chunk, _, callback) {
      stream.emit(chunk.name, chunk.value);
      callback(null);
    }
  });
  return stream;
};

emitter.asStream = emitter;
emitter.emitter = emitter;

export default emitter;
export {emitter};
