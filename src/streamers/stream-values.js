// @ts-self-types="./stream-values.d.ts"

import {asStream} from 'stream-chain';
import {asWebStream} from 'stream-chain/web';

import factory from '../core/streamers/stream-values.js';
import withParser from '../utils/with-parser.js';

/** @type {any} */ (factory).asStream = options => asStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});
/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {writableObjectMode: true, readableObjectMode: true, ...options});
/** @type {any} */ (factory).withParser = options => withParser(factory, {packKeys: true, jsonStreaming: true, ...options});
/** @type {any} */ (factory).withParserAsStream = options =>
  /** @type {any} */ (withParser).asStream(factory, {packKeys: true, jsonStreaming: true, ...options});
/** @type {any} */ (factory).withParserAsWebStream = options =>
  /** @type {any} */ (withParser).asWebStream(factory, {packKeys: true, jsonStreaming: true, ...options});

export default factory;
export {factory as streamValues};
export * from '../core/streamers/stream-values.js';
