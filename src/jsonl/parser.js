// @ts-self-types="./parser.d.ts"

import parserStream from 'stream-chain/jsonl/parserStream.js';
import parserWebStream from 'stream-chain/jsonl/parserWebStream.js';

import factory, {jsonlParser, checkedParse} from '../core/jsonl/parser.js';

const parser = options => factory(options);

parser.parser = parser;
parser.jsonlParser = jsonlParser;
parser.checkedParse = checkedParse;
parser.asStream = options => parserStream(options);
parser.asWebStream = options => parserWebStream(options);

export default parser;
export {parser, jsonlParser, checkedParse};
