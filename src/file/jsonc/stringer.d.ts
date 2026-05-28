import type * as parser from '../../core/parser.js';
import type {JsoncStringerOptions} from '../../core/jsonc/stringer.js';

/**
 * Creates an output-edge sink stage that writes a JSONC token stream to a file.
 *
 * JSONC variant — emits `whitespace` and comment tokens; round-trip-faithful
 * with the JSONC `parseFile`.
 *
 * Node-only — writes through `node:fs/promises`.
 *
 * @param path - Path to the output file.
 * @param options - Combined stringer and write-block options.
 * @returns A function-list composite usable as a stage in `gen([…])` / `chain([…])`.
 */
declare function stringerToFile(path: string, options?: stringerToFile.StringerToFileOptions): (value: parser.Token) => AsyncGenerator<never, void, unknown>;

declare namespace stringerToFile {
  /** Options for the JSONC `stringerToFile`. */
  export interface StringerToFileOptions extends JsoncStringerOptions {
    /** Write-block size in bytes. Defaults to 1 MB. */
    writeBlockSize?: number;
  }
}

type StringerToFileOptions = stringerToFile.StringerToFileOptions;

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
export type {StringerToFileOptions};
