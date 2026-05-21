// @ts-self-types="./parser.d.ts"

import {asWebStream} from 'stream-chain/web';

import parser from '../core/parser.js';

/** @type {any} */ (parser).asWebStream = options => asWebStream(parser(options), options);

export default parser;
export {parser};
