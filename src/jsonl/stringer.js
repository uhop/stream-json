// @ts-self-types="./stringer.d.ts"

'use strict';

const stringerStream = require('stream-chain/jsonl/stringerStream.js');

const jsonlStringer = options => stringerStream(options);

jsonlStringer.asStream = jsonlStringer;
jsonlStringer.make = jsonlStringer;
jsonlStringer.stringer = jsonlStringer;
jsonlStringer.jsonlStringer = jsonlStringer;

module.exports = jsonlStringer;
