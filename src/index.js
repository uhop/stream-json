// @ts-self-types="./index.d.ts"

import parser from './parser.js';

const parserStream = parser.asStream;

export default parserStream;
export {parserStream, parser};
