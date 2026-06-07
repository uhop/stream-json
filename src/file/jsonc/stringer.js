// @ts-self-types="./stringer.d.ts"

// JSONC variant of `stringerToFile`. See `src/file/stringer.js` for the design;
// the only difference is the inner stringer stage (JSONC-aware — preserves
// `whitespace` and comment tokens in the output).

import {gen} from 'stream-chain/core';
import jsoncStringer from '../../core/jsonc/stringer.js';
import asyncBlockWriter from 'stream-chain/utils/asyncBlockWriter.js';

const stringerToFile = (path, options) => gen(jsoncStringer(options), asyncBlockWriter(path, options));

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
