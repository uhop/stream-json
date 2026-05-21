// @ts-self-types="./filter.d.ts"

import {asStream} from 'stream-chain';

import {filterBase, makeStackDiffer} from './filter-base.js';
import withParser from '../utils/with-parser.js';

const filter = options => {
  const specialAction = options?.acceptObjects ? 'accept' : 'accept-token',
    stackDiffer = makeStackDiffer();
  return filterBase({
    specialAction,
    transition(stack, chunk, _action, options) {
      return stackDiffer(stack, chunk, options);
    }
  })(options);
};

filter.filter = filter;
filter.asStream = options => asStream(filter(options), {writableObjectMode: true, readableObjectMode: true, ...options});
filter.withParser = options => withParser(filter, {packKeys: true, ...options});
filter.withParserAsStream = options => withParser.asStream(filter, {packKeys: true, ...options});

const asStream_ = filter.asStream;
const withParser_ = filter.withParser;
const withParserAsStream = filter.withParserAsStream;

export default filter;
export {filter, asStream_ as asStream, withParser_ as withParser, withParserAsStream};
