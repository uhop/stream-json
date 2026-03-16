/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

/**
 * @deprecated Use `fixUtf8Stream` from `stream-chain/utils/fixUtf8Stream.js` instead.
 * This class will be removed in a future major version.
 *
 * Sanitizes multibyte UTF-8 text that may be split across chunk boundaries.
 *
 * Buffers incomplete multibyte sequences and emits properly decoded text.
 */
declare class Utf8Stream extends Transform {
  constructor(options?: TransformOptions);
}

export = Utf8Stream;
