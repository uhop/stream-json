# stream-json [![NPM version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/stream-json.svg
[npm-url]: https://npmjs.org/package/stream-json

`stream-json` is a micro-library of Node.js stream components for creating custom JSON processing pipelines with a minimal memory footprint. It can parse JSON files far exceeding available memory. Even individual data items (keys, strings, and numbers) can be streamed piece-wise. A SAX-inspired event-based API is included.

Components:

- **[Parser](https://github.com/uhop/stream-json/wiki/Parser)** — streaming JSON parser producing a SAX-like token stream.
  - Optionally packs keys, strings, and numbers (controlled separately).
  - The [main module](https://github.com/uhop/stream-json/wiki/Main-module) creates a parser decorated with `emit()`.
- **Filters** edit a token stream:
  - [Pick](https://github.com/uhop/stream-json/wiki/Pick) — selects matching subobjects, ignoring the rest.
  - [Replace](https://github.com/uhop/stream-json/wiki/Replace) — substitutes matching subobjects with a replacement.
  - [Ignore](https://github.com/uhop/stream-json/wiki/Ignore) — removes matching subobjects entirely.
  - [Filter](https://github.com/uhop/stream-json/wiki/Filter) — filters subobjects while preserving the JSON shape.
- **Streamers** assemble tokens into JavaScript objects:
  - [StreamValues](https://github.com/uhop/stream-json/wiki/StreamValues) — streams successive JSON values (for JSON Streaming or after `pick()`).
  - [StreamArray](https://github.com/uhop/stream-json/wiki/StreamArray) — streams elements of a top-level array.
  - [StreamObject](https://github.com/uhop/stream-json/wiki/StreamObject) — streams top-level properties of an object.
- **Essentials:**
  - [Assembler](https://github.com/uhop/stream-json/wiki/Assembler) — reconstructs JavaScript objects from tokens (EventEmitter).
  - [Disassembler](https://github.com/uhop/stream-json/wiki/Disassembler) — converts JavaScript objects into a token stream.
  - [Stringer](https://github.com/uhop/stream-json/wiki/Stringer) — converts a token stream back into JSON text.
  - [Emitter](https://github.com/uhop/stream-json/wiki/Emitter) — re-emits tokens as named events.
- **Utilities:**
  - [emit()](<https://github.com/uhop/stream-json/wiki/emit()>) — attaches token events to any stream.
  - [withParser()](<https://github.com/uhop/stream-json/wiki/withParser()>) — creates parser + component pipelines.
  - [Batch](https://github.com/uhop/stream-json/wiki/Batch) — groups items into arrays.
  - [Verifier](https://github.com/uhop/stream-json/wiki/Verifier) — validates JSON text, pinpoints errors.
  - [FlexAssembler](https://github.com/uhop/stream-json/wiki/FlexAssembler) — Assembler with custom containers (Map, Set, etc.) at specific paths.
  - [Utf8Stream](https://github.com/uhop/stream-json/wiki/Utf8Stream) — sanitizes multibyte UTF-8 input.
- **JSONL** ([JSON Lines](http://jsonlines.org/) / [NDJSON](http://ndjson.org/)):
  - [jsonl/Parser](https://github.com/uhop/stream-json/wiki/jsonl-Parser) — parses JSONL into `{key, value}` objects. Faster than `parser({jsonStreaming: true})` + `streamValues()` when items fit in memory.
  - [jsonl/Stringer](https://github.com/uhop/stream-json/wiki/jsonl-Stringer) — serializes objects to JSONL text. Faster than `disassembler()` + `stringer()`.
- **JSONC** ([JSON with Comments](https://jsonc.org/)):
  - [jsonc/Parser](https://github.com/uhop/stream-json/wiki/jsonc-Parser) — streaming JSONC parser with comment and whitespace tokens.
  - [jsonc/Stringer](https://github.com/uhop/stream-json/wiki/jsonc-Stringer) — converts JSONC token streams back to text.

All components are building blocks for custom data processing pipelines. They can be combined with each other and with custom code via [stream-chain](https://www.npmjs.com/package/stream-chain).

Distributed under the New BSD license.

## Introduction

```js
const {chain} = require('stream-chain');

const {parser} = require('stream-json');
const {pick} = require('stream-json/filters/pick.js');
const {ignore} = require('stream-json/filters/ignore.js');
const {streamValues} = require('stream-json/streamers/stream-values.js');

const fs = require('fs');
const zlib = require('zlib');

const pipeline = chain([
  fs.createReadStream('sample.json.gz'),
  zlib.createGunzip(),
  parser(),
  pick({filter: 'data'}),
  ignore({filter: /\b_meta\b/i}),
  streamValues(),
  data => {
    const value = data.value;
    // keep data only for the accounting department
    return value && value.department === 'accounting' ? data : null;
  }
]);

let counter = 0;
pipeline.on('data', () => ++counter);
pipeline.on('end', () => console.log(`The accounting department has ${counter} employees.`));
```

See the full documentation in [Wiki](https://github.com/uhop/stream-json/wiki).

Companion projects:

- [stream-csv-as-json](https://www.npmjs.com/package/stream-csv-as-json) streams huge CSV files in a format compatible with `stream-json`:
  rows as arrays of string values. If a header row is used, it can stream rows as objects with named fields.

## Installation

```bash
npm install --save stream-json
# or: yarn add stream-json
```

## Use

The library is organized as small composable components based on Node.js [streams](http://nodejs.org/api/stream.html) and [events](http://nodejs.org/api/events.html). The source code is compact — read it to understand how things work and to build your own components.

Bug reports, simplifications, and new generic components are welcome — open a ticket or pull request.

## Release History

- 2.0.0 _major rewrite: functional API based on `stream-chain` 3.x, bundled TypeScript definitions, lowercase module paths._
- 1.9.0 _fixed a slight deviation from the JSON standard. Thx [Peter Burns](https://github.com/rictic)._
- 1.8.0 _added an option to indicate/ignore JSONL errors. Thx, [AK](https://github.com/ak--47)._
- 1.7.5 _fixed a stringer bug with ASCII control symbols. Thx, [Kraicheck](https://github.com/Kraicheck)._

The full history is in the wiki: [Release history](https://github.com/uhop/stream-json/wiki/Release-history).
