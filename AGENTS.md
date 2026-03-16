# AGENTS.md — stream-json

> `stream-json` is a micro-library of Node.js stream components for creating custom JSON processing pipelines with a minimal memory footprint. It can parse JSON files far exceeding available memory streaming individual primitives using a SAX-inspired API. It depends on [stream-chain](https://www.npmjs.com/package/stream-chain) for pipeline composition.

For project structure, module dependencies, and the architecture overview see [ARCHITECTURE.md](./ARCHITECTURE.md).
For detailed usage docs and API references see the [wiki](https://github.com/uhop/stream-json/wiki).

## Setup

This project uses a git submodule for the wiki:

```bash
git clone --recursive git@github.com:uhop/stream-json.git
cd stream-json
npm install
```

## Commands

- **Install:** `npm install`
- **Test:** `npm test` (runs `tape6 --flags FO`)
- **Test (Bun):** `npm run test:bun`
- **Test (sequential):** `npm run test:proc`
- **Test (single file):** `node tests/test-<name>.mjs`
- **TypeScript check:** `npm run ts-check`
- **Lint:** `npm run lint` (Prettier check)
- **Lint fix:** `npm run lint:fix` (Prettier write)

## Project structure

```
stream-json/
├── package.json          # Package config; "tape6" section configures test discovery
├── src/                  # Source code
│   ├── index.js          # Main entry point: creates Parser + emit()
│   ├── index.d.ts        # TypeScript definitions for the main module
│   ├── parser.js         # Streaming SAX-like JSON parser (token stream)
│   ├── parser.d.ts       # TypeScript definitions for parser
│   ├── assembler.js      # Token stream → JavaScript objects (EventEmitter)
│   ├── assembler.d.ts    # TypeScript definitions for assembler
│   ├── disassembler.js   # JavaScript objects → token stream
│   ├── disassembler.d.ts # TypeScript definitions for disassembler
│   ├── stringer.js       # Token stream → JSON text (Transform stream)
│   ├── stringer.d.ts     # TypeScript definitions for stringer
│   ├── emitter.js        # Token stream → events (Writable stream)
│   ├── emitter.d.ts      # TypeScript definitions for emitter
│   ├── filters/          # Token stream editors
│   │   ├── filter-base.js    # Base for all filters (filterBase + makeStackDiffer)
│   │   ├── pick.js           # Pick subobjects by path
│   │   ├── replace.js        # Replace subobjects with a value
│   │   ├── ignore.js         # Remove subobjects (Replace variant)
│   │   └── filter.js         # Filter tokens preserving shape
│   ├── streamers/        # Token stream → object stream
│   │   ├── stream-base.js    # Base for all streamers (uses Assembler)
│   │   ├── stream-values.js  # Stream successive JSON values
│   │   ├── stream-array.js   # Stream array elements
│   │   └── stream-object.js  # Stream object properties
│   ├── utils/            # Utilities
│   │   ├── emit.js           # Attach token events to a stream
│   │   ├── with-parser.js    # Create parser + component pipelines
│   │   ├── batch.js          # Batch items into arrays (Transform stream)
│   │   ├── verifier.js       # Validate JSON text (Writable stream)
│   │   └── utf8-stream.js    # Fix multi-byte UTF-8 splits
│   └── jsonl/            # JSONL (line-separated JSON) support
│       ├── parser.js         # JSONL parser → {key, value} objects
│       └── stringer.js       # Objects → JSONL text
├── tests/                # Test files (test-*.mjs, using tape-six)
├── wiki/                 # GitHub wiki documentation (git submodule)
└── .github/              # CI workflows, Dependabot config
```

## Code style

- **CommonJS** throughout (`"type": "commonjs"` in package.json).
- **No transpilation** — code runs directly.
- **Prettier** for formatting (see `.prettierrc`): 160 char width, single quotes, no bracket spacing, no trailing commas, arrow parens "avoid".
- 2-space indentation.
- Semicolons are enforced by Prettier (default `semi: true`).
- Imports use `require()` syntax in source, `import` in tests (`.mjs`).
- The package is `stream-json`. It depends on `stream-chain` for pipeline composition.

## Critical rules

- **One runtime dependency: `stream-chain`.** Do not add other packages to `dependencies`. Only `devDependencies` are allowed.
- **Do not modify or delete test expectations** without understanding why they changed.
- **Do not add comments or remove comments** unless explicitly asked.
- **Keep `.js` and `.d.ts` files in sync** for all modules under `src/`.
- **Token-based architecture.** The parser produces a stream of `{name, value}` tokens. All filters, streamers, and utilities operate on this token protocol.
- **Backpressure must be handled correctly.** All stream components rely on Node.js stream infrastructure via `stream-chain`.

## Architecture

- **Parser** (`src/parser.js`) is the core. It consumes text and produces a SAX-like token stream: `{name: 'startObject'}`, `{name: 'keyValue', value: 'key'}`, `{name: 'stringValue', value: '...'}`, etc.
  - Uses `stream-chain`'s `gen()`, `flushable()`, `many()`, `none`, `fixUtf8Stream`, and `asStream`.
  - Options: `packKeys`, `packStrings`, `packNumbers`, `streamKeys`, `streamStrings`, `streamNumbers`, `jsonStreaming`.
- **Assembler** (`src/assembler.js`) interprets the token stream and reconstructs JavaScript objects. It is an `EventEmitter`, not a stream.
  - Used internally by all streamers via `streamBase`.
  - `Assembler.connectTo(stream)` listens on `'data'` events and emits `'done'` when a top-level value is assembled.
  - `asm.tapChain` is a function for use in `chain()`.
- **Disassembler** (`src/disassembler.js`) does the inverse: JS objects → token stream.
- **Stringer** (`src/stringer.js`) converts a token stream back to JSON text.
- **Emitter** (`src/emitter.js`) re-emits tokens as named events.
- **Filters** (`src/filters/`) edit the token stream: `pick`, `replace`, `ignore`, `filter`. All built on `filterBase`.
  - `filterBase` provides a state machine that tracks JSON path stack and applies accept/reject actions.
  - `makeStackDiffer` generates structural tokens to reconstruct the surrounding JSON envelope.
- **Streamers** (`src/streamers/`) assemble complete JS objects from the token stream: `streamValues`, `streamArray`, `streamObject`. All built on `streamBase`.
  - `streamBase` uses `Assembler` internally and supports `objectFilter` for early rejection.
- **Utilities**: `emit()`, `withParser()`, `Batch`, `Verifier`, `Utf8Stream`.
  - `withParser(fn, options)` creates a `gen(parser(options), fn(options))` pipeline — the most common pattern.
  - Most components export `.withParser(options)` and `.withParserAsStream(options)` static methods.
- **JSONL**: `jsonl/parser.js` and `jsonl/stringer.js` for line-separated JSON.

## Writing tests

```js
import test from 'tape-six';
import {parser} from '../src/index.js';
import {streamArray} from '../src/streamers/stream-array.js';
import chain from 'stream-chain';
import {Readable} from 'node:stream';

test('example', async t => {
  const output = [];
  const pipeline = chain([Readable.from(['[1, 2, 3]']), parser(), streamArray()]);
  pipeline.on('data', item => output.push(item));
  await new Promise(resolve => pipeline.on('end', resolve));
  t.deepEqual(
    output.map(o => o.value),
    [1, 2, 3]
  );
});
```

- Test files use `tape-six`: `.mjs` for runtime tests.
- Test file naming convention: `test-*.mjs` in `tests/`.
- Tests are configured in `package.json` under the `"tape6"` section.
- Test files should be directly executable: `node tests/test-foo.mjs`.

## Token protocol

The parser emits these token types:

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

## Key conventions

- The only runtime dependency is `stream-chain`. Do not add others.
- All public API is in `src/`. Keep `.js` and `.d.ts` files in sync.
- Wiki documentation lives in the `wiki/` submodule.
- Most components follow the factory pattern: `const {pick} = require('stream-json/filters/Pick')`.
- Components that work with a parser typically export `.withParser()` and `.withParserAsStream()`.
- The `Assembler.tapChain` property returns a function suitable for use in `chain()`.

## When reading the codebase

- Start with `ARCHITECTURE.md` for the module map and dependency graph.
- `src/parser.js` is the core — read it first to understand the token protocol.
- `src/filters/filter-base.js` is the foundation for all filters — read it to understand path matching.
- `src/streamers/stream-base.js` is the foundation for all streamers — read it to understand object assembly.
- Wiki markdown files in `wiki/` contain detailed usage docs.
