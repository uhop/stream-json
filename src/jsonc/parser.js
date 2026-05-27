// @ts-self-types="./parser.d.ts"

import {asStream} from 'stream-chain';
import {asWebStream} from 'stream-chain/web';

import factory from '../core/jsonc/parser.js';

/** @type {any} */ (factory).asStream = options => asStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});
/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default factory;
export {factory as parser};
export * from '../core/jsonc/parser.js';
