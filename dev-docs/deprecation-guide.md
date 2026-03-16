# Deprecation Guide

> How to deprecate stream-json modules that are superseded by stream-chain 3.4.x.

## Deprecation strategy

Deprecated modules are **not removed**. They continue to work for at least one major version cycle. The goal is to guide users toward the stream-chain equivalents while preserving backward compatibility.

## Per-module deprecation details

---

### `src/utils/utf8-stream.js` — `Utf8Stream`

**Superseded by:** `stream-chain/utils/fixUtf8Stream.js`

**Why:** The JSON parser already uses `fixUtf8Stream` from stream-chain directly. After `JsonlParser` is reworked (Phase 1), nothing inside stream-json inherits from `Utf8Stream`. External users who subclass it are the only remaining consumers.

**JSDoc annotation** (`src/utils/utf8-stream.d.ts`):

```ts
/**
 * @deprecated Use `fixUtf8Stream` from `stream-chain/utils/fixUtf8Stream.js` instead.
 * This class will be removed in a future major version.
 *
 * Sanitizes multibyte UTF-8 text that may be split across chunk boundaries.
 */
```

**Runtime warning** (in constructor, once per process):

```js
let warned = false;
constructor(options) {
  if (!warned) {
    process.emitWarning(
      'Utf8Stream is deprecated. Use fixUtf8Stream from stream-chain instead.',
      'DeprecationWarning'
    );
    warned = true;
  }
  // ...existing code
}
```

**Wiki update** (`wiki/Utf8Stream.md`):

Add at the very top:

```md
> **Deprecated.** Use [`fixUtf8Stream`](https://github.com/uhop/stream-chain/wiki/fixUtf8Stream)
> from `stream-chain` instead. This module will be removed in a future major version.
```

**Migration example:**

```js
// Before (deprecated)
const Utf8Stream = require('stream-json/utils/utf8-stream.js');
const pipeline = fs.createReadStream('data.txt').pipe(new Utf8Stream());

// After
const {chain} = require('stream-chain');
const fixUtf8Stream = require('stream-chain/utils/fixUtf8Stream.js');
const pipeline = chain([fs.createReadStream('data.txt'), fixUtf8Stream()]);
```

---

### `src/utils/batch.js` — `Batch`

**Superseded by:** `stream-chain/utils/batch.js`

**Why:** The stream-chain `batch()` is a lightweight `flushable` function that achieves the same result without the class overhead. The stream-json `Batch` class is only needed for its `withParser()` convenience.

**JSDoc annotation** (`src/utils/batch.d.ts`):

```ts
/**
 * @deprecated Use `batch` from `stream-chain/utils/batch.js` inside a `chain()` pipeline instead.
 * This class will be removed in a future major version.
 *
 * Groups incoming items into arrays of a configurable size.
 */
```

**Runtime warning** (in constructor or `make()`, once per process):

```js
let warned = false;
static make(options) {
  if (!warned) {
    process.emitWarning(
      'Batch from stream-json is deprecated. Use batch() from stream-chain instead.',
      'DeprecationWarning'
    );
    warned = true;
  }
  // ...existing code
}
```

**Wiki update** (`wiki/Batch.md`):

```md
> **Deprecated.** Use [`batch`](https://github.com/uhop/stream-chain/wiki/batch)
> from `stream-chain` instead. This module will be removed in a future major version.
```

**Migration example:**

```js
// Before (deprecated)
const Batch = require('stream-json/utils/batch.js');
chain([source, parser(), streamArray(), Batch.make({batchSize: 100})]);

// After
const batch = require('stream-chain/utils/batch.js');
chain([source, parser(), streamArray(), batch(100)]);
```

---

### `src/jsonl/parser.js` — `JsonlParser`

**Superseded by:** `stream-chain/jsonl/parser.js` + `stream-chain/jsonl/parserStream.js`

**Why:** stream-chain's JSONL parser composes `fixUtf8Stream()` + `lines()` + `JSON.parse` in a `gen()` pipeline — simpler and more composable. The stream-json version is a 134-line class with manual line splitting.

**Note:** This module is **not deprecated** — it is **re-implemented** using stream-chain internals. The public interface stays identical. Only the internals change.

The `errorIndicator` and `checkErrors` options have no stream-chain equivalent, so the adapter layer is stream-json-specific. The `checkedParse()` static method is also kept.

**No deprecation notice needed.** Users see no change.

---

### `src/jsonl/stringer.js` — `JsonlStringer`

**Superseded by:** `stream-chain/jsonl/stringerStream.js`

**Why:** stream-chain's stringer is a superset (adds `prefix`, `suffix`, `space`, `emptyValue`). The stream-json version is a subset.

**Note:** Like `JsonlParser`, this module is **re-implemented** using stream-chain internals. The public interface stays identical. No deprecation notice needed.

**Optional enhancement:** Expose the new `prefix`, `suffix`, `space`, `emptyValue` options in the `.d.ts` so users can benefit from stream-chain's extras without importing it directly.

---

## Deprecation timeline

| Module          | Version deprecated | Earliest removal |
| --------------- | ------------------ | ---------------- |
| `Utf8Stream`    | 2.0.0              | 3.0.0            |
| `Batch` (class) | 2.0.0              | 3.0.0            |

## Deprecation checklist template

For each deprecated module:

- [ ] Add `@deprecated` JSDoc tag to `.d.ts` with migration path
- [ ] Add one-time `process.emitWarning()` in `.js`
- [ ] Add deprecation banner to wiki page
- [ ] Add migration example to wiki page
- [ ] Keep all existing tests passing
- [ ] Do NOT change the module's `require()` path
- [ ] Do NOT change the module's public API
