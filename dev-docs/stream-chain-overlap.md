# stream-chain 3.4.x Overlap Analysis

> Mapping `stream-json` 2.0.0 modules to `stream-chain` 3.4.1 equivalents.

## Current stream-chain usage in stream-json

`stream-json` already imports these from `stream-chain`:

| Import                                      | Used in                                            |
| ------------------------------------------- | -------------------------------------------------- |
| `none`                                      | parser, assembler, filters, streamers              |
| `many`                                      | parser, filters                                    |
| `flushable`                                 | parser, filter-base                                |
| `gen`                                       | parser, with-parser                                |
| `asStream`                                  | parser, with-parser, disassembler                  |
| `isMany`, `getManyValues`, `combineManyMut` | replace filter                                     |
| `fixUtf8Stream`                             | parser (via `stream-chain/utils/fixUtf8Stream.js`) |

## Module-by-module comparison

---

### 1. Utf8Stream → `fixUtf8Stream`

|                   | stream-json `Utf8Stream`                       | stream-chain `fixUtf8Stream`                       |
| ----------------- | ---------------------------------------------- | -------------------------------------------------- |
| **File**          | `src/utils/utf8-stream.js` (56 LOC)            | `utils/fixUtf8Stream.js` (34 LOC)                  |
| **Type**          | `Transform` class                              | `flushable` function                               |
| **API**           | `new Utf8Stream(options)`                      | `fixUtf8Stream()` returns a function for `chain()` |
| **Core**          | `StringDecoder` + `_buffer` + `_processBuffer` | `StringDecoder` + `flushable()`                    |
| **Extensibility** | Subclassable — `JsonlParser` extends it        | Not extensible                                     |

**Key finding:** `Utf8Stream` is a _base class_ for `JsonlParser`, which overrides `_processBuffer`. The stream-chain `fixUtf8Stream` is a plain function.

**Already leveraged:** `parser.js` already uses `fixUtf8Stream` from stream-chain (not `Utf8Stream`).

**Verdict:** `Utf8Stream` becomes **redundant** if `JsonlParser` is reworked to not inherit from it. Mark as **deprecated** — re-export `fixUtf8Stream` from stream-chain with a deprecation notice.

---

### 2. Batch → `batch`

|                  | stream-json `Batch`           | stream-chain `batch`      |
| ---------------- | ----------------------------- | ------------------------- |
| **File**         | `src/utils/batch.js` (47 LOC) | `utils/batch.js` (26 LOC) |
| **Type**         | `Transform` class             | `flushable` function      |
| **API**          | `Batch.make({batchSize: N})`  | `batch(N)`                |
| **Default size** | 1000                          | 100                       |
| **Extras**       | `withParser()` static method  | —                         |

**Verdict:** **Deprecate class.** Re-implement as a thin wrapper around `stream-chain/utils/batch` that preserves the existing interface (`make()`, `batch()`, `withParser()`, `batchSize` option name). The class version becomes a deprecated compatibility shim.

---

### 3. JSONL Parser → `jsonl/parser` + `jsonl/parserStream`

|                 | stream-json `JsonlParser`                                            | stream-chain `parser` / `parserStream`                        |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| **File**        | `src/jsonl/parser.js` (134 LOC)                                      | `jsonl/parser.js` (30 LOC) + `jsonl/parserStream.js` (18 LOC) |
| **Type**        | `Transform` class extending `Utf8Stream`                             | `gen(fixUtf8Stream, lines, parse)` + `asStream()`             |
| **Output**      | `{key, value}` objects                                               | `{key, value}` objects                                        |
| **Error modes** | `checkErrors` (boolean), `errorIndicator` (function/value/undefined) | `ignoreErrors` (boolean)                                      |
| **`reviver`**   | ✅                                                                   | ✅                                                            |
| **Static**      | `make()`, `parser()`, `checkedParse()`                               | —                                                             |

**Key differences:**

- stream-json has rich error handling: `errorIndicator` can be a function `(error, input, reviver) → value`, `undefined` to suppress, or any other value used as replacement. stream-chain only has boolean `ignoreErrors`.
- stream-json splits lines manually in `_processBuffer`; stream-chain composes `fixUtf8Stream()` + `lines()` + `parse`.

**Verdict:** **Replace internals.** Rewrite `JsonlParser` to delegate to `stream-chain/jsonl/parser` for the core pipeline. Build the `errorIndicator` / `checkErrors` adapter on top. Keep the same public interface.

---

### 4. JSONL Stringer → `jsonl/stringerStream`

|                       | stream-json `JsonlStringer`                                  | stream-chain `stringerStream`                                                                 |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **File**              | `src/jsonl/stringer.js` (33 LOC)                             | `jsonl/stringerStream.js` (51 LOC)                                                            |
| **Type**              | `Transform` class                                            | `Transform` (created inline)                                                                  |
| **Options**           | `replacer`, `separator`                                      | `replacer`, `separator`, `prefix`, `suffix`, `emptyValue`, `space`                            |
| **Default separator** | `'\n'`                                                       | `'\n'`                                                                                        |
| **Output**            | First item has no prefix; subsequent items prepend separator | First item prepends `prefix`; subsequent items prepend `separator`; appends `suffix` on flush |

**Key differences:**

- stream-chain's version is a **superset**: it adds `prefix`, `suffix`, `emptyValue`, and `space` options.
- stream-json's version is simpler but less capable.

**Verdict:** **Replace internals.** Rewrite `JsonlStringer` as a thin wrapper around `stream-chain/jsonl/stringerStream`. Map `separator` and `replacer` through; ignore `prefix`/`suffix`/`space` (they'll be available if users want them). Keep same public interface.

---

### 5. No overlap — stream-json unique modules

These modules have no equivalent in stream-chain and must be kept:

| Module                 | Reason                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `parser.js`            | SAX-like JSON tokenizer — core of stream-json, already uses stream-chain primitives |
| `assembler.js`         | Token→object reconstruction (EventEmitter)                                          |
| `disassembler.js`      | Object→token stream, already uses `asStream`                                        |
| `stringer.js`          | Token→JSON text (complex token protocol)                                            |
| `emitter.js`           | Token→events (Writable stream)                                                      |
| `filters/*`            | Token-stream editors — unique to stream-json's token protocol                       |
| `streamers/*`          | Token-stream assemblers — unique to stream-json                                     |
| `utils/emit.js`        | Lightweight event attachment                                                        |
| `utils/with-parser.js` | Parser pipeline builder, already uses `gen()` + `asStream()`                        |
| `utils/verifier.js`    | JSON validation — standalone, no stream-chain overlap                               |

---

### 6. stream-chain utilities with no stream-json equivalent

These stream-chain utilities could be **re-exported** from stream-json for convenience:

| stream-chain utility          | Purpose                | Re-export value                 |
| ----------------------------- | ---------------------- | ------------------------------- |
| `utils/take.js`               | Take first N items     | Useful with streamers           |
| `utils/skip.js`               | Skip first N items     | Useful with streamers           |
| `utils/takeWhile.js`          | Take while predicate   | Useful with streamers           |
| `utils/skipWhile.js`          | Skip while predicate   | Useful with streamers           |
| `utils/fold.js` / `reduce.js` | Reduce to single value | Useful for aggregation          |
| `utils/scan.js`               | Running accumulator    | Useful for running stats        |
| `utils/lines.js`              | Split into lines       | Useful for JSONL pre-processing |
| `utils/readableFrom.js`       | Iterable→Readable      | Useful for test fixtures        |
| `utils/reduceStream.js`       | Reduce as Writable     | Useful for aggregation          |

**Recommendation:** Do not re-export these. They are general-purpose and users should import them directly from `stream-chain`. Document the availability in wiki/README.

## Summary matrix

| stream-json module     | stream-chain equivalent                     | Action                                        |
| ---------------------- | ------------------------------------------- | --------------------------------------------- |
| `utils/utf8-stream.js` | `utils/fixUtf8Stream.js`                    | **Deprecate** — delegate internally           |
| `utils/batch.js`       | `utils/batch.js`                            | **Deprecate** — wrap stream-chain's `batch()` |
| `jsonl/parser.js`      | `jsonl/parser.js` + `jsonl/parserStream.js` | **Replace internals** — keep interface        |
| `jsonl/stringer.js`    | `jsonl/stringerStream.js`                   | **Replace internals** — keep interface        |
| All other modules      | (no equivalent)                             | **Keep** — unique to stream-json              |
