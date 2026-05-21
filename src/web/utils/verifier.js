// @ts-self-types="./verifier.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../../core/utils/verifier.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default factory;
export * from '../../core/utils/verifier.js';
