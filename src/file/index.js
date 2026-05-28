// @ts-self-types="./index.d.ts"

// Barrel for `stream-json/file/*` — the Node-only JSON file I/O entry points
// plus the small generic helpers (`pipe`, `drain`) most users will pair them
// with. JSONC variants live under `stream-json/file/jsonc/*`.

import parseFile from './parser.js';
import verifyFile from './verifier.js';
import stringerToFile from './stringer.js';
import pipe from '../core/utils/pipe.js';
import drain from '../core/utils/drain.js';

export default parseFile;
export {parseFile, verifyFile, stringerToFile, pipe, drain};
