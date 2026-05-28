import type * as parser from '../../core/parser.js';
import type {JsoncParserOptions} from '../../core/jsonc/parser.js';

/**
 * Creates an input-edge stage that turns a file path into a JSONC token stream.
 *
 * JSONC variant of `parseFile` — handles comments, trailing commas, and emits
 * `whitespace` / comment tokens for round-trip-faithful editing.
 *
 * Node-only — reads through `node:fs/promises`.
 *
 * @param options - Combined parser and read-block options.
 * @returns A function-list composite usable as a stage in `gen([…])` / `chain([…])`.
 */
declare function parseFile(options?: parseFile.ParseFileOptions): (path: string) => AsyncGenerator<parser.Token, void, unknown>;

declare namespace parseFile {
  /** Options for the JSONC `parseFile`. */
  export interface ParseFileOptions extends JsoncParserOptions {
    /** Read-block size in bytes. Defaults to 64 KB. */
    readBlockSize?: number;
  }
}

type ParseFileOptions = parseFile.ParseFileOptions;

export default parseFile;
export {parseFile, parseFile as parser};
export type {ParseFileOptions};
