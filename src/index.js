// @ts-self-types="./index.d.ts"

import parser from './parser.js';
import emit from './utils/emit.js';

const make = options => emit(parser.asStream(options));
make.parser = parser;

export default make;
export {make, parser};
