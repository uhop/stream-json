import type {Token} from './parser.js';

export interface AssemblerOptions {
  /** Called for each assembled value, like `JSON.parse()` reviver. */
  reviver?: (key: string, value: any) => any;
  /** If `true`, numbers are kept as strings instead of parsed with `parseFloat()`. */
  numberAsString?: boolean;
  /** Called each time a top-level value is fully assembled. Replaces the 2.x `'done'` event. */
  onDone?: (asm: Assembler) => void;
}

/**
 * Interprets a token stream and reconstructs JavaScript objects.
 *
 * Plain class — no `EventEmitter` inheritance. Use `connectTo()` to attach it
 * to a token stream, or call `consume()` / `tapChain` manually. Pass an
 * `onDone` option (or call `.onDone(fn)`) to receive a callback each time a
 * top-level value is fully assembled.
 */
declare class Assembler {
  /**
   * Creates an Assembler, connects it to a token stream, and returns it.
   */
  static connectTo(stream: any, options?: AssemblerOptions): Assembler;
  /** Factory function. Creates a new Assembler instance. */
  static assembler(options?: AssemblerOptions): Assembler;

  constructor(options?: AssemblerOptions);

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
  tapChain(chunk: Token): any;

  /** Attaches to a token stream; the `onDone` callback fires when a value is assembled. */
  connectTo(stream: any): this;

  /** Sets or clears the per-value callback. Pass `null` to clear. */
  onDone(fn: ((asm: Assembler) => void) | null): this;

  /** Current nesting depth. 0 when idle or at the top level. */
  get depth(): number;
  /** Current path as an array of keys (strings) and indices (numbers). */
  get path(): (string | number)[];

  /** Discards partially assembled state down to the given depth. */
  dropToLevel(level: number): this;
  /** Feeds a single token into the assembler. */
  consume(chunk: Token): this;

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
  export type {AssemblerOptions};
}

/** Factory function. Creates a new Assembler instance. */
declare function assembler(options?: AssemblerOptions): Assembler;

export default Assembler;
export {Assembler, assembler};
