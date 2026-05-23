import type {Token} from './parser.js';

/** Options for the Assembler constructor and `Assembler.connectTo` static. */
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
   *
   * Substrate-aware: accepts either a Node `Readable` or a Web `ReadableStream`.
   * Detection is by feature-probing `typeof stream.getReader === 'function'`; the
   * Web branch pumps via `getReader()`, the Node branch attaches a `'data'` listener.
   *
   * @param stream - A Node `Readable` or a Web `ReadableStream` producing `{name, value}` tokens.
   * @param options - Assembler options including `onDone`, `reviver`, `numberAsString`.
   * @returns A new Assembler instance connected to the stream.
   */
  static connectTo(stream: any, options?: AssemblerOptions): Assembler;
  /**
   * Factory function. Creates a new Assembler instance.
   *
   * @param options - Assembler options including `onDone`, `reviver`, `numberAsString`.
   * @returns A new Assembler instance.
   */
  static assembler(options?: AssemblerOptions): Assembler;

  /**
   * @param options - Assembler options including `onDone`, `reviver`, `numberAsString`.
   */
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
   *
   * @param chunk - The token to consume.
   * @returns The assembled value when `done`, or `none` otherwise.
   */
  tapChain(chunk: Token): any;

  /**
   * Attaches to a token stream; the `onDone` callback fires when a value is assembled.
   *
   * Substrate-aware: accepts either a Node `Readable` or a Web `ReadableStream`.
   * Detection is by feature-probing `typeof stream.getReader === 'function'`; the
   * Web branch pumps via `getReader()`, the Node branch attaches a `'data'` listener.
   * On the Web branch this returns immediately while the async pump runs in the
   * background — drive completion via the `onDone` callback rather than the return value.
   *
   * For hot paths, prefer a manual `for await (const tok of stream) asm.consume(tok)`
   * loop over `connectTo` — no async-closure overhead, errors propagate directly.
   *
   * @param stream - A Node `Readable` or a Web `ReadableStream` producing `{name, value}` tokens.
   * @returns `this`, for chaining.
   */
  connectTo(stream: any): this;

  /**
   * Sets or clears the per-value callback. Pass `null` to clear.
   *
   * @param fn - Callback invoked as `fn(asm)` each time a top-level value is assembled, or `null` to clear.
   * @returns `this`, for chaining.
   */
  onDone(fn: ((asm: Assembler) => void) | null): this;

  /** Current nesting depth. 0 when idle or at the top level. */
  get depth(): number;
  /** Current path as an array of keys (strings) and indices (numbers). */
  get path(): (string | number)[];

  /**
   * Discards partially assembled state down to the given depth.
   *
   * @param level - The depth to truncate to. No-op if `level >= depth`.
   * @returns `this`, for chaining.
   */
  dropToLevel(level: number): this;
  /**
   * Feeds a single token into the assembler.
   *
   * @param chunk - The token to consume.
   * @returns `this`, for chaining.
   */
  consume(chunk: Token): this;

  /** Token handler: stores a packed key for the next value. */
  keyValue(value: string): void;
  /** Token handler: places a string value into the current container. */
  stringValue(value: string): void;
  /** Token handler: places a number value (parsed unless `numberAsString`) into the current container. */
  numberValue(value: string): void;
  /** Token handler: places `null` into the current container. */
  nullValue(): void;
  /** Token handler: places `true` into the current container. */
  trueValue(): void;
  /** Token handler: places `false` into the current container. */
  falseValue(): void;
  /** Token handler: opens a new object container. */
  startObject(): void;
  /** Token handler: closes the current object container. */
  endObject(): void;
  /** Token handler: opens a new array container. */
  startArray(): void;
  /** Token handler: closes the current array container. */
  endArray(): void;
}

declare namespace Assembler {
  export type {AssemblerOptions};
}

/**
 * Factory function. Creates a new Assembler instance.
 *
 * @param options - Assembler options including `onDone`, `reviver`, `numberAsString`.
 * @returns A new Assembler instance.
 */
declare function assembler(options?: AssemblerOptions): Assembler;

export default Assembler;
export {Assembler, assembler};
