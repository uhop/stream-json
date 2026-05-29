// @ts-self-types="./parser.d.ts"

import parserWebStream from 'stream-chain/jsonl/parserWebStream.js';

import factory, {jsonlParser, checkedParse} from '../../core/jsonl/parser.js';

const parser = options => factory(options);

parser.parser = parser;
parser.jsonlParser = jsonlParser;
parser.checkedParse = checkedParse;
parser.asWebStream = options => parserWebStream(options);

export default parser;
export {parser, jsonlParser, checkedParse};
