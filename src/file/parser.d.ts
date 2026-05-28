import type * as parser from '../core/parser.js';
import type {ParserOptions as CoreParserOptions} from '../core/parser.js';

/**
 * Creates an input-edge stage that turns a file path into a JSON token stream.
 *
 * Returns an `fList` (from `gen(...)`) composed of an async block reader plus
 * the standard `jsonParser`. As the first stage in a `gen([…])` pipeline,
 * accept the path as the gen's input value; downstream stages receive the
 * usual `{name, value}` JSON tokens. The pipeline must be flushed for any
 * `stringerToFile` tail to close its file — use `pipe(...)` from
 * `stream-json/utils/pipe.js` and drain via `drain(...)` from
 * `stream-json/utils/drain.js`.
 *
 * Node-only — reads through `node:fs/promises`.
 *
 * @param options - Combined parser and read-block options.
 * @returns A function-list composite usable as a stage in `gen([…])` / `chain([…])`.
 */
declare function parseFile(options?: parseFile.ParseFileOptions): (path: string) => AsyncGenerator<parser.Token, void, unknown>;

declare namespace parseFile {
  /** Options for `parseFile`. */
  export interface ParseFileOptions extends CoreParserOptions {
    /** Read-block size in bytes. Defaults to 64 KB. */
    readBlockSize?: number;
  }
}

type ParseFileOptions = parseFile.ParseFileOptions;

export default parseFile;
export {parseFile, parseFile as parser};
export type {ParseFileOptions};
