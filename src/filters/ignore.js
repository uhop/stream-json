// @ts-self-types="./ignore.d.ts"

import {asStream, none} from 'stream-chain';

import {filterBase, makeStackDiffer} from './filter-base.js';
import withParser from '../utils/with-parser.js';

const ignore = options => {
  const stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction: 'reject',
    defaultAction: 'accept-token',
    transition(stack, chunk, action, options) {
      if (action === 'reject' || action === 'reject-value') return none;
      return stackDiffer(stack, chunk, options);
    }
  })(options);
};

ignore.ignore = ignore;
ignore.asStream = options => asStream(ignore(options), {writableObjectMode: true, readableObjectMode: true, ...options});
ignore.withParser = options => withParser(ignore, {packKeys: true, ...options});
ignore.withParserAsStream = options => withParser.asStream(ignore, {packKeys: true, ...options});

const asStream_ = ignore.asStream;
const withParser_ = ignore.withParser;
const withParserAsStream = ignore.withParserAsStream;

export default ignore;
export {ignore, asStream_ as asStream, withParser_ as withParser, withParserAsStream};
