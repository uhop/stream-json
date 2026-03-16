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

## Phase 3 — Deprecate Utf8Stream

**Goal:** Mark `Utf8Stream` as deprecated once nothing internal depends on it.

### Precondition

Phase 1 must be complete (JsonlParser no longer extends Utf8Stream).

### Tasks

- [ ] Verify `Utf8Stream` is no longer imported by any `src/` file (only by tests or external users).
- [ ] Add `@deprecated Use fixUtf8Stream from stream-chain instead.` to JSDoc in `utf8-stream.d.ts`.
- [ ] Add a one-time `process.emitWarning()` in the constructor.
- [ ] Update `wiki/Utf8Stream.md` — add deprecation banner at top, link to stream-chain's `fixUtf8Stream`.
- [ ] Keep the module and tests — do not delete.

---

## Phase 4 — Deprecate Batch class

**Goal:** Replace `Batch` internals with `stream-chain/utils/batch` while keeping the class interface.

### Current architecture

```
Batch extends Transform
  └── _transform: accumulate, push when full
  └── options: {batchSize: N}
  └── static: make(), batch(), withParser()
```

### Target architecture

```
// src/utils/batch.js
const scBatch = require('stream-chain/utils/batch.js');
const {asStream} = require('stream-chain');
const withParser = require('./with-parser.js');

const make = (options) => {
  const n = (options && options.batchSize) || 1000;
  return asStream(scBatch(n), {writableObjectMode: true, readableObjectMode: true});
};
make.batch = make;
make.withParser = (options) => withParser(make, options);

module.exports = make;           // default export is the factory
module.exports.Batch = make;     // backward compat
module.exports.make = make;
module.exports.batch = make;
```

### Tasks

- [ ] Rewrite `src/utils/batch.js` as above.
- [ ] Update `src/utils/batch.d.ts` — add `@deprecated` to the class, keep factory signatures.
- [ ] Update `wiki/Batch.md` — add deprecation banner, recommend `stream-chain/utils/batch` for new code.
- [ ] Run `tests/test-batch.mjs` — must pass.

### Risk

The stream-chain `batch()` default is 100 vs stream-json's 1000. The wrapper must enforce stream-json's default. The returned stream must support backpressure correctly — `asStream()` handles this.

---

## Phase 5 — Emitter (functional rewrite)

**Goal:** Replace `class Emitter extends Writable` with a factory function.

`Emitter` is only 25 LOC. It must remain a `Writable` because it is a stream endpoint that re-emits events — it can't be a pure function. But we can drop the class.

### Target

```js
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
emitter.asStream = emitter; // identity — it is already a stream
```

### Tasks

- [ ] Rewrite `src/emitter.js` as a factory function (no class).
- [ ] Update `src/emitter.d.ts` — export a factory function; keep `Emitter` type alias.
- [ ] Update `wiki/Emitter.md` — update code examples.
- [ ] Run tests.

---

## Phase 6 — Stringer (functional rewrite)

**Goal:** Replace `class Stringer extends Transform` with a `flushable` function.

This is the most complex conversion (156 LOC). The `_transform` logic becomes the body of a `flushable` closure. The `skipValue` sub-state becomes an internal flag. The `makeArray` mode uses the flush path.

### Target

```js
const stringer = options => {
  // ... initialize state (depth, prev, values flags, makeArray)
  return flushable(chunk => {
    if (chunk === none) {
      // flush: if makeArray, return ']'
    }
    // ... same transform logic, but return string(s)
  });
};
stringer.asStream = options =>
  asStream(stringer(options), {writableObjectMode: true, readableObjectMode: false});
```

### Tasks

- [ ] Extract `_transform` logic into a pure `flushable` function.
- [ ] Handle `makeArray` mode in the flush path.
- [ ] Handle `skipValue` sub-state as a closure variable.
- [ ] Keep static methods: `make()`, `stringer()`.
- [ ] Update `.d.ts` and wiki.
- [ ] Run tests — this is the highest-risk rewrite.

---

## Phase 7 — Verifier (functional rewrite)

**Goal:** Replace `class Verifier extends Writable` with a `flushable` function.

The `Verifier` is 411 LOC with a complex regex state machine in `_processBuffer`. It produces no output — it only validates. The class is only needed for the Writable wrapper.

### Target

```js
const verifier = options => {
  // ... initialize state machine (same _processBuffer logic)
  return flushable(chunk => {
    if (chunk === none) { /* validate final state */ return none; }
    buffer += chunk;
    validate(buffer); // throws on invalid JSON
    return none;
  });
};
verifier.asStream = options => {
  const fn = verifier(options);
  return new Writable({ write(c,_,cb) { try { fn(c); cb(null); } catch(e) { cb(e); } }, ... });
};
```

### Tasks

- [ ] Extract `_processBuffer` regex state machine into a closure.
- [ ] Keep `checkedParse`, `make()`, `verifier()` static methods.
- [ ] Update `.d.ts` and wiki.
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
| `jsonl/parser.js` | ❌ class extends Utf8Stream | `gen(fixUtf8, lines, parse)` | 1 |
| `jsonl/stringer.js` | ❌ class extends Transform | delegate to stream-chain | 2 |
| `utils/utf8-stream.js` | ❌ class extends Transform | deprecated | 3 |
| `utils/batch.js` | ❌ class extends Transform | wrap stream-chain `batch()` | 4 |
| `emitter.js` | ❌ class extends Writable | factory → Writable | 5 |
| `stringer.js` | ❌ class extends Transform | `flushable` function | 6 |
| `utils/verifier.js` | ❌ class extends Writable | `flushable` function | 7 |

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

stream-json/src/stringer.js            (Phase 6: functional rewrite)
  └── stream-chain: flushable, none, asStream

stream-json/src/emitter.js             (Phase 5: factory function)
  └── (standalone, uses node:stream Writable directly)

stream-json/src/utils/verifier.js      (Phase 7: functional rewrite)
  └── stream-chain: flushable, none

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
| 5 | emitter | ~1 hour | Phase 0 |
| 6 | stringer | ~3–5 hours | Phase 0 |
| 7 | verifier | ~3–5 hours | Phase 0 |
| 8 | Documentation | ~2 hours | Phases 1–7 |
| 9 | Re-exports (optional) | deferred | Phase 8 |
