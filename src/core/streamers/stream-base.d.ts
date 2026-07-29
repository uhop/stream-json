import parser from '../parser.js';
import Assembler from '../assembler.js';

/**
 * Creates a configurable token-to-object streamer.
 *
 * `streamBase` is the foundation for `streamArray`, `streamObject`, and `streamValues`.
 * It uses an internal Assembler to reconstruct JS objects from tokens and supports
 * early rejection via `objectFilter`.
 *
 * @param config - Internal configuration (push callback, expected level, first-token check).
 * @returns A factory that takes user-facing options and returns a transform function.
 */
declare function streamBase(config: streamBase.StreamBaseConfig): (options?: streamBase.StreamBaseOptions) => (chunk: parser.Token) => unknown;

declare namespace streamBase {
  /** Internal configuration for a concrete streamer. */
  export interface StreamBaseConfig {
    /** Called when a value is assembled; pushes it downstream or discards it. */
    push(asm: Assembler, discard?: boolean): void;
    /** Validates the opening token (e.g., `streamArray` requires `startArray`). */
    first?(chunk: parser.Token): void;
    /** Nesting level at which to emit objects (0 = top-level values, 1 = array/object children). */
    level: number;
  }

  /** User-facing options shared by all streamers. Extends Assembler options. */
  export interface StreamBaseOptions extends Assembler.AssemblerOptions {
    /**
     * Inspects partially assembled objects to accept or reject early.
     * - Return `true` to accept (stop checking, finish assembly).
     * - Return `false` to reject (discard and skip).
     * - Return `undefined` to defer the decision to the next token.
     */
    objectFilter?: (asm: Assembler) => boolean | null | undefined;
    /** Include objects for which `objectFilter` never made a decision. Default: `false`. */
    includeUndecided?: boolean;
  }

  /**
   * The common shape of every streamer's output item: a `{key, value}` pair.
   *
   * `K` is the key type: `string` for `streamObject` (the property name),
   * `number` for `streamArray` (the array index) and `streamValues` (a
   * sequential counter). `T` types the assembled `value`.
   */
  export interface KeyedValue<K extends string | number = string | number, T = unknown> {
    /** The item's key: a property name, an array index, or a sequential counter. */
    key: K;
    /** The fully assembled JavaScript value, typed as `T` (default `unknown`). */
    value: T;
  }
}

type StreamBaseConfig = streamBase.StreamBaseConfig;
type StreamBaseOptions = streamBase.StreamBaseOptions;
type KeyedValue<K extends string | number = string | number, T = unknown> = streamBase.KeyedValue<K, T>;

export default streamBase;
export {streamBase};
export type {StreamBaseConfig, StreamBaseOptions, KeyedValue};
