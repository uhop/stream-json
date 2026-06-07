// @ts-self-types="./verifier.d.ts"

// JSONC variant of `verifyFile`. See `src/file/verifier.js` for the design;
// the only difference is the inner verifier stage (accepts comments + trailing
// commas).

import jsoncVerifier from '../../core/jsonc/verifier.js';
import drain from 'stream-chain/utils/drain.js';
import pipe from 'stream-chain/utils/pipe.js';
import asyncBlockReader from 'stream-chain/utils/asyncBlockReader.js';

const verifyFile = async (path, options) => {
  const run = pipe(asyncBlockReader(options), jsoncVerifier(options));
  await drain(run(path));
};

export default verifyFile;
export {verifyFile};
