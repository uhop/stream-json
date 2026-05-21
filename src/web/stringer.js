// @ts-self-types="./stringer.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../core/stringer.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default factory;
export * from '../core/stringer.js';
