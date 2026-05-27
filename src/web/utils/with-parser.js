// @ts-self-types="./with-parser.d.ts"

import {asWebStream} from 'stream-chain/web';

import withParser from '../../core/utils/with-parser.js';

/** @type {any} */ (withParser).asWebStream = (fn, options) =>
  asWebStream(withParser(fn, options), {...options, writableObjectMode: false, readableObjectMode: true});

export default withParser;
export {withParser};
export * from '../../core/utils/with-parser.js';
