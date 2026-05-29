// @ts-self-types="./stringer.d.ts"

import factory from 'stream-chain/web/jsonl/stringer.js';

const stringer = options => factory(options);

/** @type {any} */ (stringer).asWebStream = stringer;

stringer.stringer = stringer;

export default stringer;
export {stringer, stringer as jsonlStringer};
