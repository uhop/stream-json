/// <reference types="node" />

import {Duplex} from 'node:stream';
import parser, {ParserOptions} from './parser';

declare function make(options?: ParserOptions): Duplex;

declare namespace make {
  export {parser};
}

export = make;
