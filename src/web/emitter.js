// @ts-self-types="./emitter.d.ts"

const emitter = options => {
  const target = new EventTarget();
  /** @type {any} */ (target).writable = new WritableStream(
    {
      write(chunk) {
        target.dispatchEvent(new CustomEvent(chunk.name, {detail: chunk.value}));
      }
    },
    options?.strategy
  );
  return target;
};

emitter.asWebStream = emitter;
emitter.emitter = emitter;

export default emitter;
export {emitter};
