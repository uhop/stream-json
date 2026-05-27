// @ts-self-types="./parser.d.ts"

import {asStream} from 'stream-chain';
import {asWebStream} from 'stream-chain/web';

import parser from '../core/jsonc/parser.js';

/** @type {any} */ (parser).asStream = options => asStream(parser(options), {writableObjectMode: true, readableObjectMode: true, ...options});
/** @type {any} */ (parser).asWebStream = options => asWebStream(parser(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default parser;
export {parser, parser as jsoncParser};
