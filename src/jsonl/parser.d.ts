/// <reference types="node" />

import {TransformOptions} from 'node:stream';
import Utf8Stream from '../utils/utf8-stream';

export = JsonlParser;

declare class JsonlParser extends Utf8Stream {
  static make(options?: JsonlParser.JsonlParserOptions): JsonlParser;
  static parser(options?: JsonlParser.JsonlParserOptions): JsonlParser;
  static checkedParse(input: string, reviver?: (key: string, value: any) => any, errorIndicator?: any): any;
  constructor(options?: JsonlParser.JsonlParserOptions);
}

declare namespace JsonlParser {
  export interface JsonlParserOptions extends TransformOptions {
    reviver?: (key: string, value: any) => any;
    errorIndicator?: any;
    checkErrors?: boolean;
  }
  export interface JsonlItem {
    key: number;
    value: any;
  }
}
