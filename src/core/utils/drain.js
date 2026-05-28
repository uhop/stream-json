// @ts-self-types="./drain.d.ts"

// Drains an async iterable, returning its last yielded value (or `undefined`
// if it yielded nothing). The standard way to run a `gen([…])(value)` pipeline
// whose output you don't otherwise want: sink-terminated chains
// (e.g. `gen([…, stringerToFile(path)])`) yield nothing and resolve to
// `undefined`; single-final-value termini (an assembler-style stage that
// yields once) come through as the resolved value.

const drain = async g => {
  let last;
  for await (const v of g) last = v;
  return last;
};

export default drain;
export {drain};
