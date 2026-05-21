// @ts-self-types="./with-parser.d.ts"

import {gen} from 'stream-chain/core';

import parser from '../parser.js';

const withParser = (fn, options) => gen(parser(options), fn(options));

withParser.withParser = withParser;

export default withParser;
export {withParser};
