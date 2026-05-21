// @ts-self-types="./pick.d.ts"

import {asStream} from 'stream-chain';

import filterBase from './filter-base.js';
import withParser from '../utils/with-parser.js';

const pick = /** @type {any} */ (filterBase());

pick.pick = pick;
pick.asStream = options => asStream(pick(options), {writableObjectMode: true, readableObjectMode: true, ...options});
pick.withParser = options => withParser(pick, {packKeys: true, ...options});
pick.withParserAsStream = options => withParser.asStream(pick, {packKeys: true, ...options});

const asStream_ = pick.asStream;
const withParser_ = pick.withParser;
const withParserAsStream = pick.withParserAsStream;

export default pick;
export {pick, asStream_ as asStream, withParser_ as withParser, withParserAsStream};
