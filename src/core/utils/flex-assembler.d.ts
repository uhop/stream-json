import type {none} from 'stream-chain/defs.js';

import type {Token} from '../parser.js';

/**
 * Structural type for the Node-side substrate. Matches `Readable` without
 * pulling in `node:*` — the core .d.ts files stay free of Node imports.
 */
type ReadableLike = {on(event: 'data', listener: (chunk: Token) => void): unknown};
/** A token-producing stream: either a Web `ReadableStream<Token>` or a Node `Readable`-like. */
type TokenSource = ReadableStream<Token> | ReadableLike;

/**
 * Assembler with custom containers. Lets the user substitute Map, Set, or
 * other objects at specific paths, falling back to plain `{}`/`[]` elsewhere.
 *
 * Plain class — no `EventEmitter` inheritance. Pass an `onDone` option
 * (or call `.onDone(fn)`) to receive a callback each time a top-level value
 * is fully assembled.
 *
 * Generic in `T` (default `unknown`) — the type of the fully assembled value
 * (`current` / `tapChain()`). Orthogonal to the per-rule container type `C` on
 * `ObjectRule<C>` / `ArrayRule<C>`: `T` is the whole result, `C` is one custom
 * container.
 */
declare class FlexAssembler<T = unknown> {
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
  static connectTo<T = unknown>(stream: TokenSource, options?: FlexAssembler.FlexAssemblerOptions<T>): FlexAssembler<T>;
  /**
   * Factory function. Creates a new FlexAssembler instance.
   *
   * @param options - FlexAssembler options.
   * @returns A new FlexAssembler instance.
   */
  static flexAssembler<T = unknown>(options?: FlexAssembler.FlexAssemblerOptions<T>): FlexAssembler<T>;

  /**
   * @param options - FlexAssembler options.
   */
  constructor(options?: FlexAssembler.FlexAssemblerOptions<T>);

  /** Stack of parent containers and their metadata. */
  objectStack: FlexAssembler.StackEntry[];
  /** Path to the current container (array of string keys and numeric indices). */
  keyStack: (string | number)[];
  /** The object currently being assembled. `T` when complete; partial state mid-stream. */
  current: T | null;
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
  tapChain(chunk: Token): T | typeof none;

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
  connectTo(stream: TokenSource): this;

  /**
   * Sets or clears the per-value callback. Pass `null` to clear.
   *
   * @param fn - Callback invoked as `fn(asm)` each time a top-level value is assembled, or `null` to clear.
   * @returns `this`, for chaining.
   */
  onDone(fn: ((asm: FlexAssembler<T>) => void) | null): this;

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

  /**
   * Rule for substituting a custom container at matching object paths.
   *
   * Generic in container type `C` (default `unknown`). To get callbacks typed
   * against a concrete container, either annotate the rule (`const r: ObjectRule<Map<string, unknown>> = {...}`)
   * or wrap with the `objectRule<C>` helper — the helper additionally type-erases
   * the result so it composes into the heterogeneous `objectRules` array.
   */
  export interface ObjectRule<C = unknown> {
    /** Selector for paths where this rule applies. */
    filter: Filter;
    /** Factory called at `startObject` for matching paths; returns the empty container. */
    create: (path: (string | number)[]) => C;
    /** Inserts a key/value pair into the container created by `create`. */
    add: (container: C, key: string, value: unknown) => void;
    /** Optional post-processing called at `endObject`; its return value replaces the container. */
    finalize?: (container: C) => unknown;
  }

  /**
   * Rule for substituting a custom container at matching array paths.
   *
   * Generic in container type `C` (default `unknown`). See `ObjectRule` for the
   * authoring pattern and the `arrayRule<C>` helper.
   */
  export interface ArrayRule<C = unknown> {
    /** Selector for paths where this rule applies. */
    filter: Filter;
    /** Factory called at `startArray` for matching paths; returns the empty container. */
    create: (path: (string | number)[]) => C;
    /** Appends a value to the container created by `create`. */
    add: (container: C, value: unknown) => void;
    /** Optional post-processing called at `endArray`; its return value replaces the container. */
    finalize?: (container: C) => unknown;
  }

  /** Internal compiled form of an `ObjectRule` or `ArrayRule` — `filter` resolved to a `FilterFunction`. */
  export interface CompiledRule {
    /** Compiled predicate; converted from the rule's `Filter` at construction. */
    filter: FilterFunction;
    /** Same as the source rule's `create`. */
    create: (path: (string | number)[]) => unknown;
    /** Same as the source rule's `add` (object or array signature). */
    add: (...args: unknown[]) => void;
    /** Same as the source rule's optional `finalize`. */
    finalize?: (container: unknown) => unknown;
  }

  /** Internal snapshot pushed on `objectStack` when entering a nested container. */
  export interface StackEntry {
    /** The parent container (object or array) at this level. */
    container: unknown;
    /** The compiled rule active for the parent container, or `null` if none matched. */
    rule: CompiledRule | null;
    /** `true` when the parent container is an array. */
    isArray: boolean;
    /** Current array index within the parent (when `isArray` is `true`); `-1` otherwise. */
    arrayIndex: number;
  }

  /**
   * Options for the FlexAssembler constructor and `FlexAssembler.connectTo` static.
   *
   * Generic in `T` (default `unknown`) — the assembled-value type that flows into
   * the `onDone` callback. Independent of the per-rule container types.
   */
  export interface FlexAssemblerOptions<T = unknown> {
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
    onDone?: (asm: FlexAssembler<T>) => void;
  }
}

type FilterFunction = FlexAssembler.FilterFunction;
type Filter = FlexAssembler.Filter;
type ObjectRule<C = unknown> = FlexAssembler.ObjectRule<C>;
type ArrayRule<C = unknown> = FlexAssembler.ArrayRule<C>;
type CompiledRule = FlexAssembler.CompiledRule;
type StackEntry = FlexAssembler.StackEntry;
type FlexAssemblerOptions<T = unknown> = FlexAssembler.FlexAssemblerOptions<T>;

/**
 * Factory function. Creates a new FlexAssembler instance.
 *
 * @param options - FlexAssembler options.
 * @returns A new FlexAssembler instance.
 */
declare function flexAssembler<T = unknown>(options?: FlexAssemblerOptions<T>): FlexAssembler<T>;

/**
 * Type-safe authoring helper for `ObjectRule`. Declare the container type once;
 * `create` / `add` / `finalize` callbacks are typed against `C`. Returns the
 * type-erased `ObjectRule` shape so the rule composes into the heterogeneous
 * `objectRules` array (where TS variance otherwise rejects typed rules).
 *
 * At runtime this is a typed identity function — the helper only exists for
 * the compile-time variance escape.
 *
 * @example
 * objectRule<Map<string, unknown>>({
 *   filter: 'foo',
 *   create: () => new Map(),
 *   add: (m, k, v) => m.set(k, v),
 *   finalize: m => Object.fromEntries(m),
 * });
 */
declare function objectRule<C>(rule: ObjectRule<C>): ObjectRule;

/**
 * Type-safe authoring helper for `ArrayRule`. See `objectRule` for the rationale.
 *
 * @example
 * arrayRule<Set<unknown>>({
 *   filter: 'tags',
 *   create: () => new Set(),
 *   add: (s, v) => s.add(v),
 * });
 */
declare function arrayRule<C>(rule: ArrayRule<C>): ArrayRule;

export default FlexAssembler;
export {FlexAssembler, flexAssembler, objectRule, arrayRule};
export type {FilterFunction, Filter, ObjectRule, ArrayRule, CompiledRule, StackEntry, FlexAssemblerOptions};
