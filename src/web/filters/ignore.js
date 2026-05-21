// @ts-self-types="./ignore.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../../core/filters/ignore.js';
import withParser from '../utils/with-parser.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});
/** @type {any} */ (factory).withParserAsWebStream = options => /** @type {any} */ (withParser).asWebStream(factory, {packKeys: true, ...options});

export default factory;
export * from '../../core/filters/ignore.js';
