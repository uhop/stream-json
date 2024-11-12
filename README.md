# stream-json [![NPM version][npm-image]][npm-url]

[npm-image]:      https://img.shields.io/npm/v/stream-json.svg
[npm-url]:        https://npmjs.org/package/stream-json

`stream-json` is a micro-library of node.js stream components with minimal dependencies for creating custom data processors oriented on processing huge JSON files while requiring a minimal memory footprint. It can parse JSON files far exceeding available memory. Even individual primitive data items (keys, strings, and numbers) can be streamed piece-wise. Streaming SAX-inspired event-based API is included as well.

Available components:

* Streaming JSON [Parser](https://github.com/uhop/stream-json/wiki/Parser).
  * It produces a SAX-like token stream.
  * Optionally it can pack keys, strings, and numbers (controlled separately).
  * The [main module](https://github.com/uhop/stream-json/wiki/Main-module) provides helpers to create a parser.
* Filters to edit a token stream:
  * [Pick](https://github.com/uhop/stream-json/wiki/Pick) selects desired objects.
    * It can produces multiple top-level objects just like in [JSON Streaming](https://en.wikipedia.org/wiki/JSON_Streaming) protocol.
    * Don't forget to use [StreamValues](https://github.com/uhop/stream-json/wiki/StreamValues) when picking several subobjects!
  * [Replace](https://github.com/uhop/stream-json/wiki/Replace) substitutes objects with a replacement.
  * [Ignore](https://github.com/uhop/stream-json/wiki/Ignore) removes objects.
  * [Filter](https://github.com/uhop/stream-json/wiki/Filter) filters tokens maintaining stream's validity.
* Streamers to produce a stream of JavaScript objects.
  * [StreamValues](https://github.com/uhop/stream-json/wiki/StreamValues) can handle a stream of JSON objects.
    * Useful to stream objects selected by `Pick`, or generated by other means.
    * It supports [JSON Streaming](https://en.wikipedia.org/wiki/JSON_Streaming) protocol, where individual values are separated semantically (like in `"{}[]"`), or with white spaces (like in `"true 1 null"`).
  * [StreamArray](https://github.com/uhop/stream-json/wiki/StreamArray) takes an array of objects and produces a stream of its components.
    * It streams array components individually taking care of assembling them automatically.
    * Created initially to deal with JSON files similar to [Django](https://www.djangoproject.com/)-produced database dumps.
    * Only one top-level array per stream is valid!
  * [StreamObject](https://github.com/uhop/stream-json/wiki/StreamObject) takes an object and produces a stream of its top-level properties.
    * Only one top-level object per stream is valid!
* Essentials:
  * [Assembler](https://github.com/uhop/stream-json/wiki/Assembler) interprets a token stream creating JavaScript objects.
  * [Disassembler](https://github.com/uhop/stream-json/wiki/Disassembler) produces a token stream from JavaScript objects.
  * [Stringer](https://github.com/uhop/stream-json/wiki/Stringer) converts a token stream back into a JSON text stream.
  * [Emitter](https://github.com/uhop/stream-json/wiki/Emitter) reads a token stream and emits each token as an event.
    * It can greatly simplify data processing.
* Utilities:
  * [emit()](https://github.com/uhop/stream-json/wiki/emit()) makes any stream component to emit tokens as events.
  * [withParser()](https://github.com/uhop/stream-json/wiki/withParser()) helps to create stream components with a parser.
  * [Batch](https://github.com/uhop/stream-json/wiki/Batch) batches items into arrays to simplify their processing.
  * [Verifier](https://github.com/uhop/stream-json/wiki/Verifier) reads a stream and verifies that it is a valid JSON.
  * [Utf8Stream](https://github.com/uhop/stream-json/wiki/Utf8Stream) sanitizes multibyte `utf8` text input.
* Special helpers:
  * JSONL AKA [JSON Lines](http://jsonlines.org/) AKA [NDJSON](http://ndjson.org/):
    * [jsonl/Parser](https://github.com/uhop/stream-json/wiki/jsonl-Parser) parses a JSONL file producing objects similar to `StreamValues`.
      * Useful when we know that individual items can fit in memory.
      * Generally it is faster than the equivalent combination of `Parser({jsonStreaming: true})` + `StreamValues`.
    * [jsonl/Stringer](https://github.com/uhop/stream-json/wiki/jsonl-Stringer) produces a JSONL file from a stream of JavaScript objects.
      * Generally it is faster than the equivalent combination of `Disassembler` + `Stringer`.

All components are meant to be building blocks to create flexible custom data processing pipelines. They can be extended and/or combined with custom code. They can be used together with [stream-chain](https://www.npmjs.com/package/stream-chain) to simplify data processing.

This toolkit is distributed under New BSD license.

## Introduction

```js
const {chain}  = require('stream-chain');

const {parser} = require('stream-json');
const {pick}   = require('stream-json/filters/Pick');
const {ignore} = require('stream-json/filters/Ignore');
const {streamValues} = require('stream-json/streamers/StreamValues');

const fs   = require('fs');
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
pipeline.on('end', () =>
  console.log(`The accounting department has ${counter} employees.`));
```

See the full documentation in [Wiki](https://github.com/uhop/stream-json/wiki).

Companion projects:

* [stream-csv-as-json](https://www.npmjs.com/package/stream-csv-as-json) streams huge CSV files in a format compatible with `stream-json`:
  rows as arrays of string values. If a header row is used, it can stream rows as objects with named fields.

## Installation

```bash
npm install --save stream-json
# or: yarn add stream-json
```

## Use

The whole library is organized as a set of small components, which can be combined to produce the most effective pipeline. All components are based on node.js
[streams](http://nodejs.org/api/stream.html), and [events](http://nodejs.org/api/events.html). They implement all required standard APIs. It is easy to add your
own components to solve your unique tasks.

The code of all components is compact and simple. Please take a look at their source code to see how things are implemented, so you can produce your own components
in no time.

Obviously, if a bug is found, or a way to simplify existing components, or new generic components are created, which can be reused in a variety of projects,
don't hesitate to open a ticket, and/or create a pull request.

## Release History

* 1.9.1 *fixed a race condition in disassembler implementation. Thx, [Noam Okman](https://github.com/noamokman).*
* 1.9.0 *fixed a slight deviation from the JSON standard. Thx [Peter Burns](https://github.com/rictic).*
* 1.8.0 *added an option to indicate/ignore JSONL errors. Thx, [AK](https://github.com/ak--47).*
* 1.7.5 *fixed a stringer bug with ASCII control symbols. Thx, [Kraicheck](https://github.com/Kraicheck).*
* 1.7.4 *updated dependency (`stream-chain`), bugfix: inconsistent object/array braces. Thx [Xiao Li](https://github.com/xli1000).*
* 1.7.3 *added an assembler option to treat numbers as strings.*
* 1.7.2 *added an error check for JSONL parsing. Thx [Marc-Andre Boily](https://github.com/maboily).*
* 1.7.1 *minor bugfix and improved error reporting.*
* 1.7.0 *added `utils/Utf8Stream` to sanitize `utf8` input, all parsers support it automatically. Thx [john30](https://github.com/john30) for the suggestion.*
* 1.6.1 *the technical release, no need to upgrade.*
* 1.6.0 *added `jsonl/Parser` and `jsonl/Stringer`.*

The rest can be consulted in the project's wiki [Release history](https://github.com/uhop/stream-json/wiki/Release-history).
