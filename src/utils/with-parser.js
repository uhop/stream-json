// @ts-self-types="./with-parser.d.ts"

import {asStream} from 'stream-chain';
import {asWebStream} from 'stream-chain/web';

import withParser from '../core/utils/with-parser.js';

/** @type {any} */ (withParser).asStream = (fn, options) =>
  asStream(withParser(fn, options), {...options, writableObjectMode: false, readableObjectMode: true});
/** @type {any} */ (withParser).asWebStream = (fn, options) =>
  asWebStream(withParser(fn, options), {...options, writableObjectMode: false, readableObjectMode: true});

export default withParser;
export * from '../core/utils/with-parser.js';
