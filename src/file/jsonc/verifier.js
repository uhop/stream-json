// @ts-self-types="./verifier.d.ts"

// JSONC variant of `verifyFile`. See `src/file/verifier.js` for the design;
// the only difference is the inner verifier stage (accepts comments + trailing
// commas).

import jsoncVerifier from '../../core/jsonc/verifier.js';
import drain from '../../core/utils/drain.js';
import pipe from '../../core/utils/pipe.js';
import asyncBlockReader from '../internal/block-reader.js';

const verifyFile = async (path, options) => {
  const run = pipe(asyncBlockReader(options), jsoncVerifier(options));
  await drain(run(path));
};

export default verifyFile;
export {verifyFile};
