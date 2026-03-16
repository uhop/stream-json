/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

declare class Emitter extends Writable {
  static make(options?: WritableOptions): Emitter;
  static emitter(options?: WritableOptions): Emitter;
  constructor(options?: WritableOptions);
}

export = Emitter;
