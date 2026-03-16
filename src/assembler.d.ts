/// <reference types="node" />

import {EventEmitter} from 'node:events';
import {none} from 'stream-chain/defs.js';
import parser from './parser';

export = Assembler;

/**
 * Interprets a token stream and reconstructs JavaScript objects.
 *
 * `Assembler` is an EventEmitter, not a stream. Use `connectTo()` to attach it
 * to a token stream, or call `consume()` / `tapChain` manually.
 * Emits a `'done'` event each time a top-level value is fully assembled.
 */
declare class Assembler extends EventEmitter {
  /**
   * Creates an Assembler, connects it to a token stream, and returns it.
   *
   * @param stream - A readable token stream (e.g., from `parser.asStream()`).
   * @param options - Assembler options.
   */
  static connectTo(stream: NodeJS.ReadableStream, options?: Assembler.AssemblerOptions): Assembler;

  constructor(options?: Assembler.AssemblerOptions);

  /** Stack of parent objects and their keys. */
  stack: any[];
  /** The object currently being assembled. */
  current: any;
  /** Current property key, or `null` if not inside an object property. */
  key: string | null;
  /** `true` when a top-level value has been fully assembled. */
  done: boolean;
  /** The active reviver function, or `false` if none. */
  reviver: ((key: string, value: any) => any) | false;

  /**
   * A function suitable for use in `chain()`. Consumes tokens and returns
   * the assembled value when done, or `none` otherwise.
   */
  tapChain(chunk: parser.Token): any;

  /** Attaches to a token stream; emits `'done'` when a value is assembled. */
  connectTo(stream: NodeJS.ReadableStream): this;

  /** Current nesting depth. 0 when idle or at the top level. */
  get depth(): number;
  /** Current path as an array of keys (strings) and indices (numbers). */
  get path(): (string | number)[];

  /** Discards partially assembled state down to the given depth. */
  dropToLevel(level: number): this;
  /** Feeds a single token into the assembler. */
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
    /** Called for each assembled value, like `JSON.parse()` reviver. */
    reviver?: (key: string, value: any) => any;
    /** If `true`, numbers are kept as strings instead of parsed with `parseFloat()`. */
    numberAsString?: boolean;
  }
  /** Factory function. Creates a new Assembler instance. */
  export function assembler(options?: AssemblerOptions): Assembler;
}
