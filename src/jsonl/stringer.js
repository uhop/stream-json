// @ts-self-types="./stringer.d.ts"

import stringerStream from 'stream-chain/jsonl/stringerStream.js';
import stringerWebStream from 'stream-chain/jsonl/stringerWebStream.js';

const stringer = options => stringerStream(options);

/** @type {any} */ (stringer).asStream = stringer;
/** @type {any} */ (stringer).asWebStream = options => stringerWebStream(options);

stringer.stringer = stringer;

export default stringer;
export {stringer, stringer as jsonlStringer};
