// @ts-self-types="./parser.d.ts"

// JSONC variant of `parseFile`. See `src/file/parser.js` for the design notes;
// the only difference is the inner parser stage (the JSONC tokenizer keeps
// `whitespace`, comment, and trailing-comma signaling for round-tripping).

import {gen} from 'stream-chain/core';
import jsoncParser from '../../core/jsonc/parser.js';
import asyncBlockReader from '../internal/block-reader.js';

const parseFile = options => gen(asyncBlockReader(options), jsoncParser(options));

export default parseFile;
export {parseFile, parseFile as parser};
