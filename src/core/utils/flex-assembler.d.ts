import type {Token} from '../parser.js';

/**
 * Assembler with custom containers. Lets the user substitute Map, Set, or
 * other objects at specific paths, falling back to plain `{}`/`[]` elsewhere.
 *
 * Plain class — no `EventEmitter` inheritance. Pass an `onDone` option
 * (or call `.onDone(fn)`) to receive a callback each time a top-level value
 * is fully assembled.
 */
declare class FlexAssembler {
  /**
   * Creates a FlexAssembler, connects it to a token stream, and returns it.
   *
   * Substrate-aware: accepts either a Node `Readable` or a Web `ReadableStream`.
   * Detection is by feature-probing `typeof stream.getReader === 'function'`.
   *
   * @param stream - A Node `Readable` or a Web `ReadableStream` producing `{name, value}` tokens.
   * @param options - FlexAssembler options including `objectRules`, `arrayRules`, `onDone`.
   * @returns A new FlexAssembler instance connected to the stream.
   */
  static connectTo(stream: any, options?: FlexAssembler.FlexAssemblerOptions): FlexAssembler;
  /**
   * Factory function. Creates a new FlexAssembler instance.
   *
   * @param options - FlexAssembler options.
   * @returns A new FlexAssembler instance.
   */
  static flexAssembler(options?: FlexAssembler.FlexAssemblerOptions): FlexAssembler;

  /**
   * @param options - FlexAssembler options.
   */
  constructor(options?: FlexAssembler.FlexAssemblerOptions);

  /** Stack of parent containers and their metadata. */
  objectStack: FlexAssembler.StackEntry[];
  /** Path to the current container (array of string keys and numeric indices). */
  keyStack: (string | number)[];
  /** The object currently being assembled. */
  current: any;
  /** Current property key, or `null` if not inside an object property. */
  key: string | null;
  /** The active rule for the current container, or `null`. */
  rule: FlexAssembler.ObjectRule | FlexAssembler.ArrayRule | null;
  /** Whether the current container is an array (or array rule). */
  isArray: boolean;
  /** Current element index within an array container (-1 before first element). */
  arrayIndex: number;
  /** `true` when a top-level value has been fully assembled. */
  done: boolean;
  /** The active reviver function, or `false` if none. */
  reviver: ((key: string, value: any) => any) | false;

  /** Compiled object rules, or `null` if none. */
  objectRules: FlexAssembler.CompiledRule[] | null;
  /** Compiled array rules, or `null` if none. */
  arrayRules: FlexAssembler.CompiledRule[] | null;

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
   * Detection is by feature-probing `typeof stream.getReader === 'function'`.
   * On the Web branch this returns immediately while the async pump runs in the
   * background — drive completion via the `onDone` callback rather than the return value.
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
  onDone(fn: ((asm: FlexAssembler) => void) | null): this;

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
  /** Token handler: opens a new object container (selecting a rule if one matches). */
  startObject(): void;
  /** Token handler: opens a new array container (selecting a rule if one matches). */
  startArray(): void;
  /** Token handler: closes the current object container (finalize hook if any). */
  endObject(): void;
  /** Token handler: closes the current array container (finalize hook if any). */
  endArray(): void;
}

declare namespace FlexAssembler {
  /** Predicate over the current JSON path. Used as the compiled form of `Filter`. */
  export type FilterFunction = (path: (string | number)[]) => boolean;
  /**
   * Matcher used to select a rule:
   * - **string** — exact-prefix match against the joined path (separator from `pathSeparator`).
   * - **RegExp** — tested against the joined path string.
   * - **function** — predicate over the path array; see `FilterFunction`.
   */
  export type Filter = string | RegExp | FilterFunction;

  /** Rule for substituting a custom container at matching object paths. */
  export interface ObjectRule {
    /** Selector for paths where this rule applies. */
    filter: Filter;
    /** Factory called at `startObject` for matching paths; returns the empty container. */
    create: (path: (string | number)[]) => any;
    /** Inserts a key/value pair into the container created by `create`. */
    add: (container: any, key: string, value: any) => void;
    /** Optional post-processing called at `endObject`; its return value replaces the container. */
    finalize?: (container: any) => any;
  }

  /** Rule for substituting a custom container at matching array paths. */
  export interface ArrayRule {
    /** Selector for paths where this rule applies. */
    filter: Filter;
    /** Factory called at `startArray` for matching paths; returns the empty container. */
    create: (path: (string | number)[]) => any;
    /** Appends a value to the container created by `create`. */
    add: (container: any, value: any) => void;
    /** Optional post-processing called at `endArray`; its return value replaces the container. */
    finalize?: (container: any) => any;
  }

  /** Internal compiled form of an `ObjectRule` or `ArrayRule` — `filter` resolved to a `FilterFunction`. */
  export interface CompiledRule {
    /** Compiled predicate; converted from the rule's `Filter` at construction. */
    filter: FilterFunction;
    /** Same as the source rule's `create`. */
    create: (path: (string | number)[]) => any;
    /** Same as the source rule's `add` (object or array signature). */
    add: (...args: any[]) => void;
    /** Same as the source rule's optional `finalize`. */
    finalize?: (container: any) => any;
  }

  /** Internal snapshot pushed on `objectStack` when entering a nested container. */
  export interface StackEntry {
    /** The parent container (object or array) at this level. */
    container: any;
    /** The compiled rule active for the parent container, or `null` if none matched. */
    rule: CompiledRule | null;
    /** `true` when the parent container is an array. */
    isArray: boolean;
    /** Current array index within the parent (when `isArray` is `true`); `-1` otherwise. */
    arrayIndex: number;
  }

  /** Options for the FlexAssembler constructor and `FlexAssembler.connectTo` static. */
  export interface FlexAssemblerOptions {
    /** Rules for custom object containers. First matching rule wins. */
    objectRules?: ObjectRule[];
    /** Rules for custom array containers. First matching rule wins. */
    arrayRules?: ArrayRule[];
    /** Separator for string/RegExp filter path joining. Default: `'.'`. */
    pathSeparator?: string;
    /** Called for each assembled value, like `JSON.parse()` reviver. Composes with custom containers. */
    reviver?: (key: string, value: any) => any;
    /** If `true`, numbers are kept as strings instead of parsed with `parseFloat()`. */
    numberAsString?: boolean;
    /** Called each time a top-level value is fully assembled. Replaces the 2.x `'done'` event. */
    onDone?: (asm: FlexAssembler) => void;
  }
}

type FilterFunction = FlexAssembler.FilterFunction;
type Filter = FlexAssembler.Filter;
type ObjectRule = FlexAssembler.ObjectRule;
type ArrayRule = FlexAssembler.ArrayRule;
type CompiledRule = FlexAssembler.CompiledRule;
type StackEntry = FlexAssembler.StackEntry;
type FlexAssemblerOptions = FlexAssembler.FlexAssemblerOptions;

/**
 * Factory function. Creates a new FlexAssembler instance.
 *
 * @param options - FlexAssembler options.
 * @returns A new FlexAssembler instance.
 */
declare function flexAssembler(options?: FlexAssemblerOptions): FlexAssembler;

export default FlexAssembler;
export {FlexAssembler, flexAssembler};
export type {FilterFunction, Filter, ObjectRule, ArrayRule, CompiledRule, StackEntry, FlexAssemblerOptions};
