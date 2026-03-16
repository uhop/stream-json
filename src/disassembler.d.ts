/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import parser from './parser';

export = disassembler;

declare function disassembler(options?: disassembler.DisassemblerOptions): (value: any) => Generator<parser.Token, void, undefined>;

declare namespace disassembler {
  export interface DisassemblerOptions extends DuplexOptions {
    packValues?: boolean;
    packKeys?: boolean;
    packStrings?: boolean;
    packNumbers?: boolean;
    streamValues?: boolean;
    streamKeys?: boolean;
    streamStrings?: boolean;
    streamNumbers?: boolean;
    replacer?: ((key: string, value: any) => any) | string[];
  }
  export function asStream(options?: DisassemblerOptions): Duplex;
  export {disassembler};
}
