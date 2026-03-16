/// <reference types="node" />

import {Transform, TransformOptions} from 'node:stream';

/**
 * Sanitizes multibyte UTF-8 text that may be split across chunk boundaries.
 *
 * Buffers incomplete multibyte sequences and emits properly decoded text.
 * Used internally by all parsers as a foundation for text-processing streams.
 */
declare class Utf8Stream extends Transform {
  constructor(options?: TransformOptions);
}

export = Utf8Stream;
