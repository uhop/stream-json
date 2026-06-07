// @ts-self-types="./verifier.d.ts"

// `verifyFile(path, options)` — standalone async JSON validator. Takes no input
// from a chain (it IS the whole pipeline); resolves on valid JSON, rejects with
// the verifier's `{message, line, pos, offset}` error on invalid input.
//
//   import {verifyFile} from 'stream-json/file/verifier.js';
//   await verifyFile('candidate.json');                 // throws on invalid
//
// Internally: an `asyncBlockReader` source plus the existing `jsonVerifier`
// flushable, driven through a one-shot `pipe(...)` so the verifier's flush is
// honored (it errors on dangling state — e.g. an unterminated string).
// Node-only.

import jsonVerifier from '../core/utils/verifier.js';
import drain from 'stream-chain/utils/drain.js';
import pipe from 'stream-chain/utils/pipe.js';
import asyncBlockReader from 'stream-chain/utils/asyncBlockReader.js';

const verifyFile = async (path, options) => {
  const run = pipe(asyncBlockReader(options), jsonVerifier(options));
  await drain(run(path));
};

export default verifyFile;
export {verifyFile};
