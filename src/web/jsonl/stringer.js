// @ts-self-types="./stringer.d.ts"

import stringerWebStream from 'stream-chain/jsonl/stringerWebStream.js';

const jsonlStringer = options => stringerWebStream(options);

/** @type {any} */ (jsonlStringer).asWebStream = jsonlStringer;

jsonlStringer.stringer = jsonlStringer;
jsonlStringer.jsonlStringer = jsonlStringer;

export default jsonlStringer;
export {jsonlStringer, jsonlStringer as stringer};
