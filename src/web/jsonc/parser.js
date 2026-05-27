// @ts-self-types="./parser.d.ts"

import {asWebStream} from 'stream-chain/web';

import parser from '../../core/jsonc/parser.js';

/** @type {any} */ (parser).asWebStream = options => asWebStream(parser(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default parser;
export {parser, parser as jsoncParser};
