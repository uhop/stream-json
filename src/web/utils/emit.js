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
  readable.pipeTo(writable).catch(() => {});
  return target;
};

export default emit;
export {emit};
