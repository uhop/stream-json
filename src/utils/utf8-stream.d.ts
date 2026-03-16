/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

declare class Utf8Stream extends Transform {
  constructor(options?: TransformOptions);
}

export = Utf8Stream;
