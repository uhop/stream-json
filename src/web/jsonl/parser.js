// @ts-self-types="./parser.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../../core/jsonl/parser.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default factory;
export {factory as parser};
export * from '../../core/jsonl/parser.js';
