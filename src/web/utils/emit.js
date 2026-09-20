// @ts-self-types="./emit.d.ts"

const emit = (readable, options) => {
  const target = new EventTarget();
  const writable = new WritableStream(
    {
      write(chunk) {
        target.dispatchEvent(new CustomEvent(chunk.name, {detail: chunk.value}));
      }
    },
    options?.strategy
  );
  // the pipe is ours, so its failure is only observable if we dispatch it
  readable.pipeTo(writable).catch(error => target.dispatchEvent(new CustomEvent('error', {detail: error})));
  return target;
};

export default emit;
export {emit};
