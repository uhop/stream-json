// @ts-self-types="./with-parser.d.ts"

import {asStream as makeStream, gen} from 'stream-chain';

import parser from '../parser.js';

const withParser = (fn, options) => gen(parser(options), fn(options));

const asStream = (fn, options) => makeStream(withParser(fn, options), {...options, writableObjectMode: false, readableObjectMode: true});

withParser.asStream = asStream;
withParser.withParser = withParser;

export default withParser;
export {withParser, asStream};
