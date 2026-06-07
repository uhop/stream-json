// @ts-self-types="./index.d.ts"

// Barrel for `stream-json/file/jsonc/*` — the Node-only JSONC file I/O entry
// points. Pair with `pipe` / `drain` from `stream-chain/utils`.

import parseFile from './parser.js';
import verifyFile from './verifier.js';
import stringerToFile from './stringer.js';

export default parseFile;
export {parseFile, verifyFile, stringerToFile};
