// @ts-self-types="./stringer.d.ts"

import stringerStream from 'stream-chain/jsonl/stringerStream.js';

const jsonlStringer = options => stringerStream(options);

jsonlStringer.stringer = jsonlStringer;
jsonlStringer.jsonlStringer = jsonlStringer;

export default jsonlStringer;
export {jsonlStringer, jsonlStringer as stringer};
