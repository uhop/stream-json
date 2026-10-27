import type * as parser from '../core/parser.js';
import type {StringerOptions as CoreStringerOptions} from '../core/stringer.js';

/**
 * Creates an output-edge sink stage that writes a JSON token stream to a file.
 *
 * Returns an `fList` (from `gen(...)`) composed of the standard `stringer` plus
 * an async block writer. As the last stage in a `gen([…])` pipeline, accept
 * `{name, value}` tokens; the writer accumulates `stringer` output and writes
 * fixed-size blocks to `path`. The pipeline MUST be flushed for the writer to
 * write its buffered tail and close the `FileHandle` — compose with `pipe(...)`
 * and `drain(...)`. A pipeline that ends without a flush releases the handle
 * through the sink's `close()`.
 *
 * Node-only — writes through `node:fs/promises`.
 *
 * @param path - Path to the output file. Truncated and created if missing.
 * @param options - Combined stringer and write-block options.
 * @returns A function-list composite usable as a stage in `gen([…])` / `chain([…])`.
 */
declare function stringerToFile(path: string, options?: stringerToFile.StringerToFileOptions): stringerToFile.StringerToFile;

declare namespace stringerToFile {
  /** Options for `stringerToFile`. */
  export interface StringerToFileOptions extends CoreStringerOptions {
    /** Write-block size in bytes. Defaults to 1 MB. */
    writeBlockSize?: number;
  }

  /** The sink returned by `stringerToFile()`. */
  export interface StringerToFile {
    (value: parser.Token): AsyncGenerator<never, void, unknown>;
    /**
     * Releases the file handle without writing the buffered tail, after any
     * write in flight settles. The pipeline calls it when it ends without a flush (an
     * error in another stage, an early break); call it yourself when driving the sink
     * some other way. Idempotent, and a no-op after a clean flush; every later call to
     * the sink throws.
     */
    close(): Promise<void>;
  }
}

type StringerToFileOptions = stringerToFile.StringerToFileOptions;
type StringerToFile = stringerToFile.StringerToFile;

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
export type {StringerToFile, StringerToFileOptions};
