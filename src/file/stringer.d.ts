import type * as parser from '../core/parser.js';
import type {StringerOptions as CoreStringerOptions} from '../core/stringer.js';

/**
 * Creates an output-edge sink stage that writes a JSON token stream to a file.
 *
 * Returns an `fList` (from `gen(...)`) composed of the standard `stringer` plus
 * an async block writer. As the last stage in a `gen([…])` pipeline, accept
 * `{name, value}` tokens; the writer accumulates `stringer` output and writes
 * fixed-size blocks to `path`. The pipeline MUST be flushed for the writer's
 * `FileHandle` to close — compose with `pipe(...)` and `drain(...)`.
 *
 * Node-only — writes through `node:fs/promises`.
 *
 * @param path - Path to the output file. Truncated and created if missing.
 * @param options - Combined stringer and write-block options.
 * @returns A function-list composite usable as a stage in `gen([…])` / `chain([…])`.
 */
declare function stringerToFile(path: string, options?: stringerToFile.StringerToFileOptions): (value: parser.Token) => AsyncGenerator<never, void, unknown>;

declare namespace stringerToFile {
  /** Options for `stringerToFile`. */
  export interface StringerToFileOptions extends CoreStringerOptions {
    /** Write-block size in bytes. Defaults to 1 MB. */
    writeBlockSize?: number;
  }
}

type StringerToFileOptions = stringerToFile.StringerToFileOptions;

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
export type {StringerToFileOptions};
