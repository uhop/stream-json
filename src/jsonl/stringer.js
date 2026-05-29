// @ts-self-types="./stringer.d.ts"

import factory from 'stream-chain/node/jsonl/stringer.js';

const stringer = options => factory(options);

/** @type {any} */ (stringer).asStream = stringer;
/** @type {any} */ (stringer).asWebStream = factory.asWebStream;

stringer.stringer = stringer;

export default stringer;
export {stringer, stringer as jsonlStringer};
