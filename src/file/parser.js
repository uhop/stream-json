// @ts-self-types="./parser.d.ts"

// `parseFile(options)` — input-edge stage that turns a path into a JSON token
// stream. Composes as the first element of a `gen([…])` pipeline; the chain is
// driven by passing the path as the gen input value.
//
//   import {pipe} from 'stream-json/utils/pipe.js';
//   import {drain} from 'stream-json/utils/drain.js';
//   import {parseFile} from 'stream-json/file/parser.js';
//
//   const c = pipe([parseFile(), /* downstream stages */]);
//   await drain(c('input.json'));
//
// Internally: an `asyncBlockReader` (async generator yielding decoded blocks
// from `fs/promises.open` + `StringDecoder('utf8')`) followed by the existing
// `jsonParser` flushable. The factory returns the composed `fList` from
// `gen(…)` so it drops transparently into any chain. Node-only.

import {gen} from 'stream-chain/core';
import jsonParser from '../core/parser.js';
import asyncBlockReader from './internal/block-reader.js';

const parseFile = options => gen(asyncBlockReader(options), jsonParser(options));

export default parseFile;
export {parseFile, parseFile as parser};
