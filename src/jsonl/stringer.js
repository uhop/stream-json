// @ts-self-types="./stringer.d.ts"

import stringerStream from 'stream-chain/jsonl/stringerStream.js';
import stringerWebStream from 'stream-chain/jsonl/stringerWebStream.js';

const jsonlStringer = options => stringerStream(options);

/** @type {any} */ (jsonlStringer).asStream = jsonlStringer;
/** @type {any} */ (jsonlStringer).asWebStream = options => stringerWebStream(options);

jsonlStringer.stringer = jsonlStringer;
jsonlStringer.jsonlStringer = jsonlStringer;

export default jsonlStringer;
export {jsonlStringer, jsonlStringer as stringer};
