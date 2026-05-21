// @ts-self-types="./emit.d.ts"

const emit = stream => stream.on('data', item => stream.emit(item.name, item.value));

export default emit;
export {emit};
