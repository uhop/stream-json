// @ts-self-types="./stream-object.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../../core/streamers/stream-object.js';
import withParser from '../utils/with-parser.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});
/** @type {any} */ (factory).withParserAsWebStream = options => /** @type {any} */ (withParser).asWebStream(factory, {packKeys: true, ...options});

export default factory;
export * from '../../core/streamers/stream-object.js';
