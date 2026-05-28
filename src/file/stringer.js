// @ts-self-types="./stringer.d.ts"

// `stringerToFile(path, options)` — output-edge sink stage that writes a JSON
// token stream to a file. Composes as the last element of a `gen([…])`
// pipeline; the pipe MUST be flushed for the writer's file handle to close —
// use `pipe(...)` from `stream-json/utils/pipe.js` and drain via
// `drain(...)` from `stream-json/utils/drain.js`.
//
//   import {pipe} from 'stream-json/utils/pipe.js';
//   import {drain} from 'stream-json/utils/drain.js';
//   import {parseFile} from 'stream-json/file/parser.js';
//   import {stringerToFile} from 'stream-json/file/stringer.js';
//
//   const c = pipe([parseFile(), /* … */, stringerToFile('out.json')]);
//   await drain(c('input.json'));
//
// Internally: the existing `stringer` flushable followed by an
// `asyncBlockWriter` (a flushable that buffers stringer output and writes
// fixed-size blocks via `fs/promises.write`; the writer's `final()` writes the
// tail and closes the FileHandle on flush). Node-only.

import {gen} from 'stream-chain/core';
import stringer from '../core/stringer.js';
import asyncBlockWriter from './internal/block-writer.js';

const stringerToFile = (path, options) => gen(stringer(options), asyncBlockWriter(path, options));

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
