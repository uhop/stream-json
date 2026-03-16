/// <reference types="node" />

import {EventEmitter} from 'node:events';
import {none} from 'stream-chain/defs.js';
import parser from './parser';

export = Assembler;

declare class Assembler extends EventEmitter {
  static connectTo(stream: NodeJS.ReadableStream, options?: Assembler.AssemblerOptions): Assembler;

  constructor(options?: Assembler.AssemblerOptions);

  stack: any[];
  current: any;
  key: string | null;
  done: boolean;
  reviver: ((key: string, value: any) => any) | false;

  tapChain(chunk: parser.Token): any;

  connectTo(stream: NodeJS.ReadableStream): this;

  get depth(): number;
  get path(): (string | number)[];

  dropToLevel(level: number): this;
  consume(chunk: parser.Token): this;

  keyValue(value: string): void;
  stringValue(value: string): void;
  numberValue(value: string): void;
  nullValue(): void;
  trueValue(): void;
  falseValue(): void;
  startObject(): void;
  endObject(): void;
  startArray(): void;
  endArray(): void;
}

declare namespace Assembler {
  export interface AssemblerOptions {
    reviver?: (key: string, value: any) => any;
    numberAsString?: boolean;
  }
  export function assembler(options?: AssemblerOptions): Assembler;
}
