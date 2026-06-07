# stream-json [![NPM version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/stream-json.svg
[npm-url]: https://npmjs.org/package/stream-json

`stream-json` is a micro-library of components for processing JSON files and streams, with a minimal memory footprint. Point it at a document far larger than available memory and it streams straight through &mdash; you pick out only the parts you care about and handle them one at a time, instead of loading the whole thing with `JSON.parse`. Even individual keys, strings, and numbers can be streamed piece by piece, and a SAX-inspired event API is included.

Each component is one stage of a pipeline: the parser turns text into a token stream, filters trim and reshape that stream on the fly, and streamers assemble the surviving tokens back into JavaScript objects. They compose with each other and with your own code through [stream-chain](https://www.npmjs.com/package/stream-chain), the zero-dependency library this one is built on; TypeScript typings are bundled.

Why it might be for you:

- **Surgical.** `pick`, `ignore`, `replace`, and `filter` keep just the subobjects you want out of a massive document and drop the rest &mdash; the bytes you skip are never assembled into memory.
- **Composable.** Every component is an ordinary pipeline stage. Mix them with each other, with plain functions and generators, and with any Node or Web stream.
- **Performance-minded.** The parser and assemblers are measured and tuned along the hot paths. Real numbers depend on your data and hardware, so [benchmark](https://github.com/uhop/stream-json/wiki/Benchmarks) on your own.
- **Solid.** ESM, bundled TypeScript typings, and a broad test suite exercised across Node, Bun, Deno, and the browser.

## Example

Pull one array out of a JSON document larger than memory and tally it &mdash; one record at a time, in constant memory:

```js
import chain from 'stream-chain';
import {parser} from 'stream-json';
import {pick} from 'stream-json/filters/pick.js';
import {streamArray} from 'stream-json/streamers/stream-array.js';
import fs from 'node:fs';

// data.json: { "meta": {...}, "data": [ ...millions of records... ] }
const pipeline = chain([
  fs.createReadStream('data.json'), // a file far bigger than RAM is fine
  parser(),
  pick({filter: 'data'}), // descend into "data", ignore everything else
  streamArray() // emit one array element at a time
]);

const byDepartment = {};
pipeline.on('data', ({value}) => {
  byDepartment[value.department] = (byDepartment[value.department] ?? 0) + 1;
});
pipeline.on('end', () => console.log(byDepartment));
```

Each stage is a building block; `stream-chain` wires them into one stream and handles the streaming and backpressure. For input straight from a file you can drop `createReadStream` in favor of the Node-only [file edges](https://github.com/uhop/stream-json/wiki/parseFile) (`parseFile()`); to write a token stream back to disk, use [stringerToFile()](https://github.com/uhop/stream-json/wiki/stringerToFile). See [Recipes](https://github.com/uhop/stream-json/wiki/Recipes) for more.

## Installation

```bash
npm install --save stream-json
```

## What's in the box

- **[Parser](https://github.com/uhop/stream-json/wiki/Parser)** &mdash; the streaming JSON parser producing a SAX-like token stream (optionally packing keys, strings, and numbers). The [main module](https://github.com/uhop/stream-json/wiki/Main-module) decorates it with `emit()`.
- **Filters** &mdash; edit a token stream on the fly: [pick](https://github.com/uhop/stream-json/wiki/Pick), [replace](https://github.com/uhop/stream-json/wiki/Replace), [ignore](https://github.com/uhop/stream-json/wiki/Ignore), [filter](https://github.com/uhop/stream-json/wiki/Filter).
- **Streamers** &mdash; assemble tokens into JavaScript objects: [streamValues](https://github.com/uhop/stream-json/wiki/StreamValues), [streamArray](https://github.com/uhop/stream-json/wiki/StreamArray), [streamObject](https://github.com/uhop/stream-json/wiki/StreamObject).
- **Essentials** &mdash; [Assembler](https://github.com/uhop/stream-json/wiki/Assembler), [Disassembler](https://github.com/uhop/stream-json/wiki/Disassembler), [Stringer](https://github.com/uhop/stream-json/wiki/Stringer), [Emitter](https://github.com/uhop/stream-json/wiki/Emitter).
- **Utilities** &mdash; [emit()](<https://github.com/uhop/stream-json/wiki/emit()>), [withParser()](<https://github.com/uhop/stream-json/wiki/withParser()>), [Batch](https://github.com/uhop/stream-json/wiki/Batch), [Verifier](https://github.com/uhop/stream-json/wiki/Verifier), [FlexAssembler](https://github.com/uhop/stream-json/wiki/FlexAssembler), and Node-only file edges ([parseFile](https://github.com/uhop/stream-json/wiki/parseFile), [stringerToFile](https://github.com/uhop/stream-json/wiki/stringerToFile), [verifyFile](https://github.com/uhop/stream-json/wiki/verifyFile)).
- **[JSONC](https://github.com/uhop/stream-json/wiki/jsonc-Parser)** ([JSON with Comments](https://jsonc.org/)) &mdash; streaming parser, stringer, and verifier, with faithful comma round-trip (`streamCommas` / `useCommas`).
- **JSONL** ([JSON Lines](https://jsonlines.org/)) &mdash; **deprecated**: now a thin re-export of [stream-chain's JSONL](https://github.com/uhop/stream-chain/wiki/jsonl), slated for removal in a future major.
- **Subpaths** &mdash; default `stream-json/...` entries attach both `.asStream` (Node `Duplex`) and `.asWebStream` (Web Streams) to every component; import from `stream-json/web/...` for browser bundles (no Node-stream code in the graph), or `stream-json/core/...` for bare factories. ESM-only, Node 22+.

Full documentation is in the **[wiki](https://github.com/uhop/stream-json/wiki)** &mdash; browse the [index](https://github.com/uhop/stream-json/wiki/Home), or [search it](https://uhop.github.io/wiki-search/app/?wiki=uhop/stream-json) by name.

## Companion projects

- [stream-chain](https://www.npmjs.com/package/stream-chain) &mdash; the pipeline-composition substrate `stream-json` is built on (wire functions, generators, and streams into one chain); also home to streaming [JSONL](https://github.com/uhop/stream-chain/wiki/jsonl).
- [stream-csv-as-json](https://www.npmjs.com/package/stream-csv-as-json) &mdash; streams huge CSV files in a `stream-json`-compatible token format: rows as arrays of strings, or as objects when a header row is present.

## License

BSD-3-Clause

## Release History

- 3.3.0 _File I/O components (`parseFile`, `stringerToFile`, `verifyFile`), faithful JSONC comma round-trip (`streamCommas` / `useCommas`), JSONL delegated to `stream-chain`._
- 3.2.0 _Improvements in TS typings, faster JSON parser._
- 3.1.0 _Web Streams parity sweep._
- 3.0.0 _Moved to ESM using `stream-chain` 4.x. See [Migrating from 2.x to 3.x](https://github.com/uhop/stream-json/wiki/Migrating-from-2.x-to-3.x)._
- 2.1.0 _new: [jsonc/Verifier](https://github.com/uhop/stream-json/wiki/jsonc-Verifier) &mdash; validates JSONC text with exact error locations. Parser performance improvements (pre-allocated token singletons)._
- 2.0.0 _major rewrite: functional API based on `stream-chain` 3.x, bundled TypeScript definitions. New: JSONC parser/stringer, FlexAssembler. See [Migrating from 1.x to 2.x](https://github.com/uhop/stream-json/wiki/Migrating-from-1.x-to-2.x)._

The full history is in the wiki: [Release history](https://github.com/uhop/stream-json/wiki/Release-history).
