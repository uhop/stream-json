// @ts-self-types="./disassembler.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../core/disassembler.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default factory;
export {factory as disassembler};
export * from '../core/disassembler.js';
