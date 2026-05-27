// @ts-self-types="./stringer.d.ts"

import stringerWebStream from 'stream-chain/jsonl/stringerWebStream.js';

const stringer = options => stringerWebStream(options);

/** @type {any} */ (stringer).asWebStream = stringer;

stringer.stringer = stringer;

export default stringer;
export {stringer, stringer as jsonlStringer};
