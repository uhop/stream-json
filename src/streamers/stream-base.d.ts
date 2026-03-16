import parser from '../parser';
import Assembler from '../assembler';
import {none} from 'stream-chain/defs.js';

export = streamBase;

declare function streamBase(config: streamBase.StreamBaseConfig): (options?: streamBase.StreamBaseOptions) => (chunk: parser.Token) => any;

declare namespace streamBase {
  export interface StreamBaseConfig {
    push(asm: Assembler, discard?: boolean): any;
    first?(chunk: parser.Token): void;
    level: number;
  }

  export interface StreamBaseOptions extends Assembler.AssemblerOptions {
    objectFilter?: (asm: Assembler) => boolean | null | undefined;
    includeUndecided?: boolean;
  }

  export {streamBase};
}
