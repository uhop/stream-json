# Rework Plan: Leveraging stream-chain 3.4.x

> Phased plan for reworking `stream-json` 2.0.0 to maximize reuse of `stream-chain` 3.4.1.
>
> See also: [functional-style.md](functional-style.md) for the rationale behind switching from OOP to functional style.

## Guiding principles

1. **Keep the public interface unchanged.** All existing `require()` paths, factory functions, static methods, and option names must continue to work.
2. **Functional first.** Rewrite class-based modules as plain functions usable in `chain()`. Provide `.asStream()` wrappers for `.pipe()` usage. This prepares for a future Web Streams transition.
3. **Deprecate, don't delete.** Modules whose functionality now lives in stream-chain get a `@deprecated` JSDoc tag and a console deprecation notice (once). They remain importable for at least one major version.
4. **Tests must keep passing.** Every phase ends with `npm test` + `npm run ts-check` green.
5. **One PR per phase.** Each phase is independently reviewable and releasable.

---

## Phase 0 — Preparation ✅

**Goal:** Verify the stream-chain dependency version and set up tooling.

- [x] Confirm `package.json` has `"stream-chain": "^3.4.1"` in `dependencies`.
- [x] Create this `dev-docs/` directory.
- [x] Verify all tests pass on the current codebase (206 tests, 491 asserts, ts-check clean).

---

## Phase 1 — JSONL Parser ✅

**Goal:** Replace `JsonlParser` internals with `stream-chain` primitives, fully functional style.

### Implementation

Rewrote `src/jsonl/parser.js` from 134-LOC class (`JsonlParser extends Utf8Stream`) to 49-LOC functional module:

```
jsonlParser(options) → gen(fixUtf8Stream(), lines(), parseLine)
  └── parseLine: handles errorIndicator/checkErrors via local checkedParse()
  └── .asStream() / .make() / .parser() → asStream() wrapper
  └── .checkedParse() → static utility
```

- [x] Composed `gen(fixUtf8Stream(), lines(), parseLine)` pipeline using stream-chain primitives.
- [x] `parseLine` handles `errorIndicator` (function/value/undefined) and `checkErrors` via local `checkedParse()`.
- [x] Removed `Utf8Stream` inheritance — no longer extends any class.
- [x] Updated `parser.d.ts` to function+namespace pattern (follows `src/parser.d.ts` style).
- [x] Updated `tests/test-types-jsonl.mts` — replaced `new` constructor + `Transform` typing with `Duplex` factory pattern.
- [x] All 18 JSONL tests pass (116 assertions), full suite 206/491, ts-check clean.

---

## Phase 2 — JSONL Stringer ✅

**Goal:** Replace `JsonlStringer` internals with `stream-chain/jsonl/stringerStream`.

### Implementation

Rewrote `src/jsonl/stringer.js` from 33-LOC class (`JsonlStringer extends Transform`) to 15-LOC delegation:

```
jsonlStringer(options) → stringerStream(options)   // from stream-chain
  └── .asStream() / .make() / .stringer() → same
```

- [x] Delegates entirely to `stream-chain/jsonl/stringerStream.js`.
- [x] Options pass through directly (stream-chain's defaults match stream-json's).
- [x] Updated `stringer.d.ts` to function+namespace pattern; exposed new stream-chain options (`prefix`, `suffix`, `space`, `emptyValue`).
- [x] Updated `tests/test-types-jsonl.mts` — replaced `new` constructor with factory pattern.
- [x] All 18 JSONL tests pass, full suite 206/491, ts-check clean.

---

## Phase 3 — Deprecate Utf8Stream ✅

**Goal:** Mark `Utf8Stream` as deprecated once nothing internal depends on it.

### Implementation

- [x] Verified no `src/` file imports `utf8-stream` (only tests and external users).
- [x] Added `@deprecated` JSDoc with migration path to `utf8-stream.d.ts`.
- [x] Added one-time `process.emitWarning()` in constructor (`utf8-stream.js`).
- [x] Updated `wiki/Utf8Stream.md` — deprecation banner with before/after migration example.
- [x] Module and all tests kept intact — 206 tests pass, ts-check clean.

---

## Phase 4 — Rewrite Batch ✅

**Goal:** Replace `Batch` class with functional wrapper around `stream-chain/utils/batch`.

### Implementation

Rewrote `src/utils/batch.js` from 47-LOC class (`Batch extends Transform`) to 30-LOC functional module:

```
batch(options) → scBatch(parseBatchSize(options))   // flushable function
  └── parseBatchSize: validates/truncates batchSize, default 1000 (vs stream-chain's 100)
  └── .asStream() / .make() / .batch() → asStream() wrapper with _batchSize
```

- [x] Default export returns flushable function (for `chain()`); `.asStream()` returns Duplex.
- [x] `parseBatchSize` preserves stream-json's validation: truncation, minimum 1, default 1000.
- [x] `_batchSize` exposed on stream for backward compat (tests check it directly).
- [x] Removed `withParser()` — batching operates on assembled objects, not parser tokens.
- [x] Updated `batch.d.ts` to function+namespace pattern with `BatchStream` type.
- [x] Updated `tests/test-types-utils.mts` — replaced `new` constructor with factory pattern.
- [x] All 6 batch tests pass (10 assertions), full suite 206/491, ts-check clean.

---

## Phase 5 — Stringer (functional rewrite) ✅

**Goal:** Replace `class Stringer extends Transform` with a `flushable` function following the stream-chain pattern.

### Implementation

Rewrote `src/stringer.js` from 156-LOC class (`Stringer extends Transform`) to 140-LOC functional module:

```
stringer(options) → flushable(processToken)   // for chain()
  └── processToken: closure with depth/prev/skip/vals state
  └── skipValue → closure variable `skip` (end-token name)
  └── makeArray → `first` flag; synthetic startArray/endArray
  └── multiple this.push() → string concatenation, return result || none
  └── .asStream() / .make() / .stringer() → asStream() wrapper
```

- [x] Extracted `_transform` into `processToken` closure returning concatenated strings.
- [x] `skipValue` → closure variable `skip` (set to end-token name, cleared on match).
- [x] `makeArray` → `first` flag; first call injects synthetic `startArray`, flush returns `endArray` or `'[]'`.
- [x] Updated `stringer.d.ts` to function+namespace pattern.
- [x] Updated `tests/test-types-core.mts` — replaced `new` constructor with factory pattern.
- [x] All 9 stringer tests pass, full suite 206/491, ts-check clean.

---

## Phase 6 — Verifier (functional rewrite) ✅

**Goal:** Replace `class Verifier extends Writable` with a composable `gen()` pipeline following the stream-chain pattern.

### Implementation

Rewrote `src/utils/verifier.js` from 411-LOC class (`Verifier extends Writable`) to 389-LOC functional module:

```
verifier(options) → gen(fixUtf8Stream(), validate)   // for chain()
  └── fixUtf8Stream: handles Buffer/string + multibyte boundaries (replaces StringDecoder)
  └── validate: flushable closure with regex state machine
  └── processBuffer: throws on invalid JSON (replaces callback(error))
  └── .asStream() / .make() / .verifier() → asStream() wrapper
```

- [x] Extracted `_processBuffer` regex state machine into closure function; `callback(error)` → `throw`.
- [x] Composed `gen(fixUtf8Stream(), validate)` — eliminated built-in StringDecoder + `_write`/`_writeBuffer`/`_writeString` dispatch.
- [x] `_makeError` / `_updatePos` → local closure helpers.
- [x] Updated `verifier.d.ts` to function+namespace pattern.
- [x] Updated `tests/test-types-utils.mts` — replaced `new` constructor with factory pattern.
- [x] All 14 verifier tests pass (15 assertions), full suite 206/491, ts-check clean.

---

## Phase 7 — Emitter (factory rewrite)

**Goal:** Replace `class Emitter extends Writable` with a factory function.

### Pattern analysis

Emitter is the **one exception** to the `fn() + asStream()` pattern. Its purpose is to sit at the end of a pipeline and re-emit token events as named Node.js events on itself:

```js
emitter.on('startObject', () => { ... });
```

A pure function can't emit events — it needs a reference to the event target (the stream). There is no meaningful "functional form for `chain()`" because users need to `.on()` the specific stream instance. This is fundamentally a stream endpoint, not a data transformation.

**Simplification:** Drop the class, use a factory returning a configured `Writable`. This is a trivial 10-LOC change.

### Target

```js
const {Writable} = require('node:stream');

const emitter = options => {
  const stream = new Writable(Object.assign({}, options, {
    objectMode: true,
    write(chunk, _, callback) {
      stream.emit(chunk.name, chunk.value);
      callback(null);
    }
  }));
  return stream;
};
emitter.asStream = emitter; // identity — already a stream
emitter.make = emitter;
emitter.emitter = emitter;
```

### Tasks

- [ ] Rewrite `src/emitter.js` as a factory function (no class, ~10 LOC).
- [ ] Update `emitter.d.ts` — function + namespace pattern.
- [ ] Run tests.

---

## Phase 8 — Documentation and cleanup

**Goal:** Update all docs to reflect the new architecture.

### Tasks

- [ ] Update `README.md` — mention functional style and stream-chain delegation.
- [ ] Update `wiki/Home.md` — add section about stream-chain utilities (take, skip, fold, scan, etc.).
- [ ] Update `ARCHITECTURE.md` — update module map and dependency graph.
- [ ] Update `wiki/Performance.md` — note internal changes.
- [ ] Add wiki links to stream-chain utility docs where relevant.
- [ ] Final `npm test` + `npm run ts-check` + `npm run lint`.

---

## Phase 9 — Future: re-export stream-chain utilities (optional)

**Goal:** Consider re-exporting useful stream-chain utilities for discoverability.

This is **not** planned for 2.0.0. Users should import directly from `stream-chain`. Candidates if we change our mind:

- `take`, `skip`, `takeWhile`, `skipWhile` — useful with streamers
- `fold` / `reduce` — useful for aggregation after streaming
- `scan` — running accumulator
- `lines` — pre-processing for custom line-based formats
- `readableFrom` — test fixtures

---

## Summary: current vs target style

| Module | Current | Target | Phase |
|--------|---------|--------|-------|
| `parser.js` | ✅ functional (`flushable` + `gen`) | — | done |
| `disassembler.js` | ✅ functional (generator + `asStream`) | — | done |
| `filters/*` | ✅ functional (`filterBase` → `flushable`) | — | done |
| `streamers/*` | ✅ functional (`streamBase` → plain fn) | — | done |
| `utils/emit.js` | ✅ functional | — | done |
| `utils/with-parser.js` | ✅ functional (`gen` + `asStream`) | — | done |
| `assembler.js` | ✅ EventEmitter (not a stream) | — | keep |
| `jsonl/parser.js` | ✅ functional (`gen` pipeline) | — | 1 ✅ |
| `jsonl/stringer.js` | ✅ functional (delegates to stream-chain) | — | 2 ✅ |
| `utils/utf8-stream.js` | ⚠️ deprecated (class kept) | — | 3 ✅ |
| `utils/batch.js` | ✅ functional (wraps stream-chain `batch()`) | — | 4 ✅ |
| `stringer.js` | ✅ functional (`flushable` + `asStream()`) | — | 5 ✅ |
| `utils/verifier.js` | ✅ functional (`gen(fixUtf8Stream, flushable)` + `asStream()`) | — | 6 ✅ |
| `emitter.js` | ❌ class extends Writable | factory → Writable (pattern exception) | 7 |

## Dependency graph after rework

```
stream-json/src/parser.js              (already functional)
  └── stream-chain: gen, flushable, many, none, asStream
  └── stream-chain/utils/fixUtf8Stream

stream-json/src/jsonl/parser.js        (Phase 1: functional rewrite)
  └── stream-chain: gen, none, asStream
  └── stream-chain/utils/fixUtf8Stream
  └── stream-chain/utils/lines

stream-json/src/jsonl/stringer.js      (Phase 2: delegate to stream-chain)
  └── stream-chain/jsonl/stringerStream

stream-json/src/utils/batch.js         (Phase 4: wrap stream-chain)
  └── stream-chain: asStream
  └── stream-chain/utils/batch

stream-json/src/stringer.js            (Phase 5: functional rewrite)
  └── stream-chain: flushable, none, asStream

stream-json/src/utils/verifier.js      (Phase 6: functional rewrite)
  └── stream-chain: gen, flushable, none, asStream
  └── stream-chain/utils/fixUtf8Stream

stream-json/src/emitter.js             (Phase 7: factory function)
  └── (standalone, uses node:stream Writable directly)

stream-json/src/utils/utf8-stream.js   (Phase 3: deprecated)
  └── (standalone, no stream-chain dependency)

stream-json/src/filters/*              (already functional)
  └── stream-chain: none, many, flushable, combineManyMut, isMany, getManyValues

stream-json/src/streamers/*            (already functional)
  └── stream-chain: none

stream-json/src/utils/with-parser.js   (already functional)
  └── stream-chain: gen, asStream
```

## Timeline estimate

| Phase | Module | Effort | Dependencies |
|-------|--------|--------|-------------|
| 0 | Preparation | ~30 min | — |
| 1 | jsonl/parser | ~2–4 hours | Phase 0 |
| 2 | jsonl/stringer | ~1 hour | Phase 0 |
| 3 | utf8-stream (deprecate) | ~30 min | Phase 1 |
| 4 | batch | ~1–2 hours | Phase 0 |
| 5 | stringer | ~3–5 hours | Phase 0 |
| 6 | verifier | ~3–5 hours | Phase 0 |
| 7 | emitter | ~30 min | Phase 0 |
| 8 | Documentation | ~2 hours | Phases 1–7 |
| 9 | Re-exports (optional) | deferred | Phase 8 |
