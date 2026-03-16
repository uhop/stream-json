/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {ParserOptions} from '../parser';

declare function withParser(fn: (options?: any) => any, options?: ParserOptions): any;

declare namespace withParser {
  export function asStream(fn: (options?: any) => any, options?: ParserOptions & DuplexOptions): Duplex;
}

export = withParser;
