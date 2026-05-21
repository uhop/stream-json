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
  static connectTo(stream: any, options?: FlexAssembler.FlexAssemblerOptions): FlexAssembler;
  static flexAssembler(options?: FlexAssembler.FlexAssemblerOptions): FlexAssembler;

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

  tapChain(chunk: Token): any;
  connectTo(stream: any): this;

  /** Sets or clears the per-value callback. Pass `null` to clear. */
  onDone(fn: ((asm: FlexAssembler) => void) | null): this;

  get depth(): number;
  get path(): (string | number)[];

  dropToLevel(level: number): this;
  consume(chunk: Token): this;

  keyValue(value: string): void;
  stringValue(value: string): void;
  numberValue(value: string): void;
  nullValue(): void;
  trueValue(): void;
  falseValue(): void;
  startObject(): void;
  startArray(): void;
  endObject(): void;
  endArray(): void;
}

declare namespace FlexAssembler {
  export type FilterFunction = (path: (string | number)[]) => boolean;
  export type Filter = string | RegExp | FilterFunction;

  export interface ObjectRule {
    filter: Filter;
    create: (path: (string | number)[]) => any;
    add: (container: any, key: string, value: any) => void;
    finalize?: (container: any) => any;
  }

  export interface ArrayRule {
    filter: Filter;
    create: (path: (string | number)[]) => any;
    add: (container: any, value: any) => void;
    finalize?: (container: any) => any;
  }

  export interface CompiledRule {
    filter: FilterFunction;
    create: (path: (string | number)[]) => any;
    add: (...args: any[]) => void;
    finalize?: (container: any) => any;
  }

  export interface StackEntry {
    container: any;
    rule: CompiledRule | null;
    isArray: boolean;
    arrayIndex: number;
  }

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

declare function flexAssembler(options?: FlexAssemblerOptions): FlexAssembler;

export default FlexAssembler;
export {FlexAssembler, flexAssembler};
export type {FilterFunction, Filter, ObjectRule, ArrayRule, CompiledRule, StackEntry, FlexAssemblerOptions};
