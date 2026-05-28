// @ts-self-types="./pipe.d.ts"

// One-shot single-value driver for a gen pipeline. `pipe(stages)` returns a
// function shaped like `gen(stages)`, but its async generator drives the
// supplied value through THEN flushes the pipeline (`g(value)` followed by
// `g(none)`). Without that flush, flushable sink stages — notably the file
// writer in `stringerToFile` that must close its FileHandle — never run their
// `final()`. Plain `gen` and core `chain` don't flush on their own; the Node
// `asStream` Duplex does (via stream-end), but in the pure-functional core
// path the caller has to.
//
// The returned function is single-shot per call: each invocation builds a
// fresh `gen` internally, so calling it again with another value is fine
// (the stages list is reused; for stateful stages such as parsers /
// stringers / writers, build a fresh `pipe` per use). Suitable for the
// "drive one path through, await completion" shape: `await drain(pipe([…])
// (path))`.

import {gen, none} from 'stream-chain/core';

const pipe = (...stages) =>
  async function* (value) {
    const g = gen(...stages);
    yield* g(value);
    yield* g(none);
  };

export default pipe;
export {pipe};
