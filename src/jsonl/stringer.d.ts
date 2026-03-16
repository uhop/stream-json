/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

export = JsonlStringer;

declare class JsonlStringer extends Transform {
  static make(options?: JsonlStringer.JsonlStringerOptions): JsonlStringer;
  static stringer(options?: JsonlStringer.JsonlStringerOptions): JsonlStringer;
  constructor(options?: JsonlStringer.JsonlStringerOptions);
}

declare namespace JsonlStringer {
  export interface JsonlStringerOptions extends TransformOptions {
    replacer?: (key: string, value: any) => any;
    separator?: string;
  }
}
