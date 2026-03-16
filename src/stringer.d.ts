/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

export = Stringer;

declare class Stringer extends Transform {
  static make(options?: Stringer.StringerOptions): Stringer;
  static stringer(options?: Stringer.StringerOptions): Stringer;
  constructor(options?: Stringer.StringerOptions);
}

declare namespace Stringer {
  export interface StringerOptions extends TransformOptions {
    useValues?: boolean;
    useKeyValues?: boolean;
    useStringValues?: boolean;
    useNumberValues?: boolean;
    makeArray?: boolean;
  }
}
