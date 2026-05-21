// @ts-self-types="./parser.d.ts"

import {asStream} from 'stream-chain';
import {asWebStream} from 'stream-chain/web';

import parser from './core/parser.js';

/** @type {any} */ (parser).asStream = options => asStream(parser(options), options);
/** @type {any} */ (parser).asWebStream = options => asWebStream(parser(options), options);

export default parser;
export {parser};
