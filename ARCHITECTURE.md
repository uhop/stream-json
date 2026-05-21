# Architecture

`stream-json` is a micro-library of Node.js stream components for creating custom JSON processing pipelines with a minimal memory footprint. It can parse JSON files far exceeding available memory. It has **one runtime dependency** — [stream-chain](https://www.npmjs.com/package/stream-chain) for pipeline composition.

## Project layout

3.x adopts a **tri-tree** structure mirroring `stream-chain` v4 — `core/` for
stream-agnostic factories, top-level `src/` for the Node-flavored wrappers
that attach `.asStream` + `.asWebStream`, and `src/web/` for browser-leaning
wrappers that attach only `.asWebStream`. Consumers pick the entry path that
matches their runtime; bundlers only walk what's actually imported.

```
src/                       # Source code
├── core/                  # Pure, stream-agnostic factories — no `node:*` imports
│   ├── parser.{js,d.ts}
│   ├── assembler.{js,d.ts}     # plain class (no EventEmitter inheritance)
│   ├── disassembler.{js,d.ts}
│   ├── stringer.{js,d.ts}
│   ├── filters/{filter-base,filter,pick,ignore,replace}.{js,d.ts}
│   ├── streamers/{stream-base,stream-array,stream-object,stream-values}.{js,d.ts}
│   ├── utils/{batch,verifier,with-parser,flex-assembler}.{js,d.ts}
│   ├── jsonl/{parser,stringer}.{js,d.ts}
│   └── jsonc/{parser,stringer,verifier}.{js,d.ts}
│
├── index.{js,d.ts}        # Node entry: re-exports parser/parserStream from ./parser.js
├── parser.{js,d.ts}       # Node wrapper: attaches BOTH .asStream + .asWebStream
├── assembler.{js,d.ts}    # Re-export of core/assembler.js (plain class is portable)
├── disassembler.{js,d.ts} # Node wrapper
├── stringer.{js,d.ts}     # Node wrapper
├── emitter.{js,d.ts}      # Node-only (extends Writable; no core/ or web/ mirror)
├── filters/{…}.{js,d.ts}  # Node wrappers
├── streamers/{…}.{js,d.ts}# Node wrappers
├── utils/                 # Node wrappers
│   ├── emit.{js,d.ts}            # Node-only (.on/.emit on streams; no mirror)
│   ├── batch.{js,d.ts}
│   ├── verifier.{js,d.ts}
│   ├── with-parser.{js,d.ts}
│   └── flex-assembler.{js,d.ts}  # Re-export of core/utils/flex-assembler.js
├── jsonl/                 # Node wrappers (jsonl/stringer is structurally Node-only)
│   ├── parser.{js,d.ts}
│   └── stringer.{js,d.ts}
├── jsonc/                 # Node wrappers
│   ├── parser.{js,d.ts}
│   ├── stringer.{js,d.ts}
│   └── verifier.{js,d.ts}
│
└── web/                   # Web entry: attaches only .asWebStream — no Node imports walked
    ├── index.{js,d.ts}    # Web main entry: parserWebStream
    ├── parser.{js,d.ts}   # Web wrapper for parser
    ├── disassembler/stringer/filters/*/streamers/*/utils/{batch,verifier,with-parser}/jsonl/parser/jsonc/*
    └── … (mirror of the Node tree minus emitter, emit, jsonl/stringer)

tests/                     # Test files (test-*.js, using tape-six)
bench/                     # Micro-benchmarks (nano-benchmark)
wiki/                      # GitHub wiki documentation (git submodule)
.github/                   # CI workflows, Dependabot config
```

**Three-entry rule:** each portable component lives in three forms — pure
factory in `core/`, Node wrapper in `src/` proper, Web wrapper under `src/web/`.
The Node wrapper attaches BOTH `.asStream` (Node Duplex) and `.asWebStream`
(Web `{readable, writable}` pair) since modern Node and Bun support both stream
flavors natively. The Web wrapper attaches only `.asWebStream` so a
browser-only bundle pulls no Node-stream code.

**Node-only components** (no `web/` mirror): `emitter.js` (extends `Writable`),
`utils/emit.js` (uses `.on`/`.emit` on streams), `jsonl/stringer.js` (uses
`stream-chain/jsonl/stringerStream` which is a Node `Transform`).

## Core concepts

### Token protocol

The parser produces a stream of `{name, value}` tokens — a SAX-inspired protocol:

| Token name    | Value  | Meaning                    |
| ------------- | ------ | -------------------------- |
| `startObject` | —      | `{` encountered            |
| `endObject`   | —      | `}` encountered            |
| `startArray`  | —      | `[` encountered            |
| `endArray`    | —      | `]` encountered            |
| `startKey`    | —      | Start of object key string |
| `endKey`      | —      | End of object key string   |
| `keyValue`    | string | Packed key value           |
| `startString` | —      | Start of string value      |
| `endString`   | —      | End of string value        |
| `stringChunk` | string | Piece of a string          |
| `stringValue` | string | Packed string value        |
| `startNumber` | —      | Start of number            |
| `endNumber`   | —      | End of number              |
| `numberChunk` | string | Piece of a number          |
| `numberValue` | string | Packed number (as string)  |
| `nullValue`   | null   | `null` literal             |
| `trueValue`   | true   | `true` literal             |
| `falseValue`  | false  | `false` literal            |

All downstream components (filters, streamers, stringer, emitter) consume and/or produce tokens in this format. This is the universal interchange protocol of the library.

### How the Parser works

1. `parser(options)` returns a `gen(fixUtf8Stream(), jsonParser(options))` pipeline — a function for use in `chain()`.
2. `parser.asStream(options)` wraps that pipeline as a Duplex stream via `asStream()`.
3. The inner `jsonParser` is a `flushable()` function that maintains a state machine. It buffers incoming text and produces `{name, value}` tokens as a `many()` array.
4. Parser options control packing and streaming of keys, strings, and numbers:
   - `packKeys`/`packStrings`/`packNumbers` (default: true) — emit `keyValue`/`stringValue`/`numberValue` tokens with the complete value.
   - `streamKeys`/`streamStrings`/`streamNumbers` (default: true) — emit `start*`/`*Chunk`/`end*` tokens for incremental processing.
   - `packValues`/`streamValues` — shortcut to set all three at once.
   - `jsonStreaming` — support multiple top-level values (JSON Streaming protocol).

### Assembler

`Assembler` is an `EventEmitter` (not a stream) that interprets the token stream and reconstructs JavaScript objects:

- `Assembler.connectTo(stream, {onDone})` — listens on `'data'` events; the `onDone(asm)` callback fires when a top-level value is assembled. The 2.x `EventEmitter` shape (`asm.on('done', …)`) is removed in 3.0 — use the `onDone` option or `asm.onDone(fn)`.
- `asm.tapChain` — a function for use in `chain()` that returns assembled values or `none`.
- Tracks `depth`, `path`, `current`, `key`, `stack`.
- Supports `reviver` option (like `JSON.parse` reviver) and `numberAsString`.

### Disassembler

The inverse of Assembler: takes JavaScript objects and produces a token stream via a generator function. Supports `replacer`, `packKeys`/`packStrings`/`packNumbers`, `streamKeys`/`streamStrings`/`streamNumbers`.

### Stringer

A `flushable` function that converts a token stream back into JSON text. Handles comma insertion, depth tracking, string escaping. Supports `useValues`/`useKeyValues`/`useStringValues`/`useNumberValues` to choose between packed and streamed tokens. `makeArray` option wraps output in `[]`. Use `stringer()` in `chain()` or `stringer.asStream()` for `.pipe()`.

### Emitter

A factory function returning a `Writable` stream that re-emits each token as a named event: `e.on('startObject', ...)`, etc. Pattern exception: since it's a stream endpoint that emits events, it returns a Writable directly rather than a plain function.

### Filters

All filters are built on `filterBase` (`src/filters/filter-base.js`):

- `filterBase({specialAction, defaultAction, nonCheckableAction, transition})` returns a factory that accepts `options` and returns a `flushable()` function.
- It maintains a path stack tracking the current JSON position.
- `filter` option: a string, RegExp, or function `(stack, chunk) → boolean` that determines whether to accept or reject each subobject.
- `makeStackDiffer` generates structural tokens (start/end object/array, key tokens) to reconstruct the surrounding JSON envelope when filtering.

| Filter    | specialAction           | defaultAction  | Effect                              |
| --------- | ----------------------- | -------------- | ----------------------------------- |
| `pick`    | `accept`                | `ignore`       | Passes only matching subobjects     |
| `replace` | `reject`                | `accept-token` | Replaces matching subobjects        |
| `ignore`  | `reject`                | `accept-token` | Removes matching subobjects         |
| `filter`  | `accept`/`accept-token` | `ignore`       | Keeps matching, preserves structure |

### Streamers

All streamers are built on `streamBase` (`src/streamers/stream-base.js`):

- `streamBase({push, first, level})` returns a factory that accepts `options` and returns a function for use in `chain()`.
- Uses `Assembler` internally to reconstruct objects.
- `level` controls when to emit: level 0 for `streamValues`, level 1 for `streamArray`/`streamObject`.
- `objectFilter` option enables early rejection: if `objectFilter(asm)` returns `false`, the object is abandoned without completing assembly.
- `first` callback validates the opening token (e.g., `streamArray` requires `startArray`).

| Streamer       | Level | Output                      | Expects                     |
| -------------- | ----- | --------------------------- | --------------------------- |
| `streamValues` | 0     | `{key: index, value: ...}`  | Any JSON values in sequence |
| `streamArray`  | 1     | `{key: index, value: ...}`  | Single top-level array      |
| `streamObject` | 1     | `{key: string, value: ...}` | Single top-level object     |

### Utilities

- **`emit(stream)`** — attaches a `'data'` listener that re-emits each token as a named event on the stream.
- **`withParser(fn, options)`** — creates `gen(parser(options), fn(options))`. Most components export `.withParser()` and `.withParserAsStream()` static methods.
- **`batch`** — Groups items into fixed-size arrays (default 1000). Wraps `stream-chain/utils/batch`. Use `batch()` in `chain()` or `batch.asStream()` for `.pipe()`.
- **`verifier`** — Validates JSON text and reports exact error position (offset, line, pos). Composed as `gen(fixUtf8Stream(), validate)`. Use `verifier()` in `chain()` or `verifier.asStream()` for `.pipe()`.

### JSONL support

- `jsonl/parser.js` — parses JSONL (one JSON value per line) producing `{key, value}` objects. Composed as `gen(fixUtf8Stream(), lines(), parseLine)`. Supports `reviver` and `errorIndicator` for error handling.
- `jsonl/stringer.js` — serializes objects to JSONL format. Delegates to `stream-chain/jsonl/stringerStream`. Configurable `separator`, `replacer`, `space`.

### JSONC support

- `jsonc/parser.js` — fork of `parser.js` with support for `//` and `/* */` comments, trailing commas, and optional `whitespace`/`comment` tokens. Options: `streamWhitespace` (default: true), `streamComments` (default: true). All standard parser options are supported.
- `jsonc/stringer.js` — fork of `stringer.js` that passes `whitespace` and `comment` tokens through verbatim. All standard stringer options are supported.
- `jsonc/verifier.js` — fork of `utils/verifier.js` that accepts comments and trailing commas. Reports error offset, line, and position for invalid JSONC.
- Downstream compatibility: all existing filters, streamers, and utilities ignore unknown token types, so they work with JSONC parser output unmodified.

## Module dependency graph

```
src/index.js ── src/parser.js, src/utils/emit.js
                    │
src/parser.js ── stream-chain (gen, flushable, many, none, asStream, fixUtf8Stream)

src/assembler.js ── stream-chain (none)

src/disassembler.js ── stream-chain (asStream)

src/stringer.js ── stream-chain (flushable, none, asStream)

src/emitter.js ── node:stream (Writable)

src/filters/filter-base.js ── stream-chain (many, isMany, getManyValues, combineManyMut, none, flushable)
src/filters/pick.js ── filter-base.js, with-parser.js
src/filters/replace.js ── stream-chain (none, isMany, getManyValues, combineManyMut, many), filter-base.js, with-parser.js
src/filters/ignore.js ── stream-chain (none), filter-base.js, with-parser.js
src/filters/filter.js ── filter-base.js, with-parser.js

src/streamers/stream-base.js ── stream-chain (none), assembler.js
src/streamers/stream-values.js ── stream-chain (none), stream-base.js, with-parser.js
src/streamers/stream-array.js ── stream-chain (none), stream-base.js, with-parser.js
src/streamers/stream-object.js ── stream-chain (none), stream-base.js, with-parser.js

src/utils/emit.js ── (standalone, no imports)
src/utils/with-parser.js ── stream-chain (asStream, gen), parser.js
src/utils/batch.js ── stream-chain (asStream), stream-chain/utils/batch
src/utils/verifier.js ── stream-chain (gen, flushable, none, asStream, fixUtf8Stream)
src/utils/flex-assembler.js ── stream-chain (none)

src/jsonl/parser.js ── stream-chain (gen, none, asStream, fixUtf8Stream, lines)
src/jsonl/stringer.js ── stream-chain/jsonl/stringerStream

src/jsonc/parser.js ── stream-chain (gen, flushable, many, none, asStream, fixUtf8Stream)
src/jsonc/stringer.js ── stream-chain (flushable, none, asStream)
src/jsonc/verifier.js ── stream-chain (gen, flushable, none, asStream, fixUtf8Stream)
```

## Import paths

`stream-json` 3.x is ESM-only. Requires Node.js 22+.

```js
// Main API
import parserStream from 'stream-json'; // parser as Duplex stream (alias of parser.asStream)
import {parser} from 'stream-json'; // parser factory

// Core components
import Assembler from 'stream-json/assembler.js';
import {disassembler} from 'stream-json/disassembler.js';
import stringer from 'stream-json/stringer.js';
import emitter from 'stream-json/emitter.js';

// Filters
import {pick} from 'stream-json/filters/pick.js';
import {replace} from 'stream-json/filters/replace.js';
import {ignore} from 'stream-json/filters/ignore.js';
import {filter} from 'stream-json/filters/filter.js';

// Streamers
import {streamValues} from 'stream-json/streamers/stream-values.js';
import {streamArray} from 'stream-json/streamers/stream-array.js';
import {streamObject} from 'stream-json/streamers/stream-object.js';

// Utilities
import emit from 'stream-json/utils/emit.js';
import withParser from 'stream-json/utils/with-parser.js';
import batch from 'stream-json/utils/batch.js';
import verifier from 'stream-json/utils/verifier.js';
import FlexAssembler from 'stream-json/utils/flex-assembler.js';

// JSONL
import jsonlParser from 'stream-json/jsonl/parser.js';
import jsonlStringer from 'stream-json/jsonl/stringer.js';

// JSONC
import jsoncParser from 'stream-json/jsonc/parser.js';
import jsoncStringer from 'stream-json/jsonc/stringer.js';
import jsoncVerifier from 'stream-json/jsonc/verifier.js';
```

## Testing

- **Framework**: tape-six (`tape6`)
- **Run all**: `npm test` (parallel workers via `tape6 --flags FO`)
- **Run single file**: `node tests/test-<name>.js`
- **Run with Bun**: `npm run test:bun`
- **Run sequential**: `npm run test:proc`
- **TypeScript check**: `npm run ts-check`
- **Lint**: `npm run lint` (Prettier check)
- **Lint fix**: `npm run lint:fix` (Prettier write)

## Benchmarks

Benchmarks use [nano-benchmark](https://www.npmjs.com/package/nano-benchmark). Run a benchmark by specifying its file:

```bash
npm run bench -- bench/<name>.js
```

### Benchmark files

| File                      | What it measures                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `bench/parser-jsonc.js`   | Parser vs JSONC Parser on the same ~100 KB JSON array. Measures overhead of comment/trailing-comma support on plain JSON.            |
| `bench/parser-jsonl.js`   | `parser({jsonStreaming: true}) + streamValues()` vs `jsonl/Parser`. Shows native `JSON.parse` advantage for strict JSONL.            |
| `bench/assembler-flex.js` | Assembler vs FlexAssembler (no rules) vs FlexAssembler (Map rules). Feeds pre-generated tokens via `consume()` — no stream overhead. |

All benchmarks generate synthetic data on the fly (~50–100 KB of mixed-type objects) to isolate component performance from I/O.
