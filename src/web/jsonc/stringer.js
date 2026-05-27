// @ts-self-types="./stringer.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../../core/jsonc/stringer.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});

export default factory;
export {factory as jsoncStringer, factory as stringer};
export * from '../../core/jsonc/stringer.js';
