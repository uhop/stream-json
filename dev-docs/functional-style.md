# Functional Style Migration

> Rationale and plan for migrating stream-json from OOP (class-based Node streams) to functional style (stream-chain patterns), preparing for a future Web Streams transition.

## Why functional?

### Node Streams: class-based OOP

Node.js streams require extending `Transform`, `Writable`, or `Duplex` and overriding internal methods:

```js
class MyTransform extends Transform {
  constructor(options) { super(options); this._state = ...; }
  _transform(chunk, encoding, callback) { ... }
  _flush(callback) { ... }
}
```

This couples logic to the Node stream lifecycle. Migrating to Web Streams means dismantling the class, extracting the transform/flush logic, and restructuring.

### Web Streams: functional composition

The WHATWG Streams API uses strategy objects — no class inheritance:

```js
new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(process(chunk));
  },
  flush(controller) {
    controller.enqueue(final());
  }
});
```

### stream-chain: the bridge

stream-chain's `flushable` / `gen` / `asStream` pattern maps directly to both paradigms:

```js
// stream-chain style
const fn = flushable(chunk => {
  if (chunk === none) return final();
  return process(chunk);
});

// → Node stream:  asStream(fn)
// → Web stream:   new TransformStream({ transform: fn, flush: () => fn(none) })
```

**Conclusion:** Writing logic as pure functions (stream-chain style) makes the codebase portable. The `asStream()` wrapper is the only Node-specific glue, and a future `asWebStream()` wrapper would be trivial.

---

## Current state

### Already functional (7 modules)

| Module                                                              | Pattern                                             |
| ------------------------------------------------------------------- | --------------------------------------------------- |
| `parser.js`                                                         | `flushable` in `gen(fixUtf8Stream(), jsonParser())` |
| `disassembler.js`                                                   | Generator function + `asStream()`                   |
| `filters/filter-base.js`                                            | Higher-order function → `flushable`                 |
| `filters/pick.js`, `replace.js`, `ignore.js`, `filter.js`           | Use `filterBase` factory                            |
| `streamers/stream-base.js`                                          | Higher-order function → plain function              |
| `streamers/stream-array.js`, `stream-object.js`, `stream-values.js` | Use `streamBase` factory                            |
| `utils/emit.js`                                                     | Plain function                                      |
| `utils/with-parser.js`                                              | Plain function using `gen()` + `asStream()`         |

### Rewritten to functional (7 modules)

| Module                 | Pattern                                               | Phase |
| ---------------------- | ----------------------------------------------------- | ----- |
| `stringer.js`          | `flushable` + `asStream()`                            | 5     |
| `emitter.js`           | Factory → `Writable` (pattern exception)              | 7     |
| `utils/batch.js`       | Wraps `stream-chain/utils/batch` + `asStream()`       | 4     |
| `utils/utf8-stream.js` | Deprecated (class kept for backward compat)           | 3     |
| `utils/verifier.js`    | `gen(fixUtf8Stream, flushable)` + `asStream()`        | 6     |
| `jsonl/parser.js`      | `gen(fixUtf8Stream, lines, parseLine)` + `asStream()` | 1     |
| `jsonl/stringer.js`    | Delegates to `stream-chain/jsonl/stringerStream`      | 2     |

### Special case: `assembler.js`

`Assembler` extends `EventEmitter`, not a stream. It is a state machine that interprets tokens into JS objects. The class pattern is appropriate here — it's not a stream component, so Web Streams migration doesn't apply. **Keep as-is.**

---

## Functional rewrite plan per module

### Tier 1 — Trivial (direct delegation to stream-chain)

#### `utils/utf8-stream.js` → delegate to `fixUtf8Stream`

```js
// Already available: stream-chain/utils/fixUtf8Stream.js
// Deprecate Utf8Stream, keep for backward compat
```

#### `utils/batch.js` → delegate to `batch`

```js
const scBatch = require('stream-chain/utils/batch.js');
const {asStream} = require('stream-chain');

const batch = options => {
  const n = (options && options.batchSize) || 1000;
  return scBatch(n);
};
batch.asStream = options => asStream(batch(options), {writableObjectMode: true, readableObjectMode: true});
batch.withParser = options => withParser(batch, options);
```

#### `jsonl/stringer.js` → delegate to `stringerStream`

```js
const scStringer = require('stream-chain/jsonl/stringerStream.js');

const make = options =>
  scStringer({
    replacer: options && options.replacer,
    separator: options && typeof options.separator == 'string' ? options.separator : '\n'
  });
```

### Tier 2 — Medium (rewrite with stream-chain primitives)

#### `emitter.js` → `flushable` function

Currently 25 LOC. The `_write` method just does `this.emit(chunk.name, chunk.value)`. This can't be a pure function because it _is_ a Writable endpoint that emits events. However, we can simplify:

```js
const {Writable} = require('node:stream');

const emitter = options => {
  const stream = new Writable({
    ...options,
    objectMode: true,
    write(chunk, _, callback) {
      stream.emit(chunk.name, chunk.value);
      callback(null);
    }
  });
  return stream;
};
```

No class needed — just a factory returning a configured `Writable`. This is the functional equivalent. **Note:** `Emitter` must remain a Writable because it's a stream _endpoint_ that re-emits events. It can't be a pure function.

#### `jsonl/parser.js` → `gen(fixUtf8Stream, lines, parse)` pipeline

Rewrite to compose stream-chain primitives:

```js
const {gen, none} = require('stream-chain');
const fixUtf8Stream = require('stream-chain/utils/fixUtf8Stream.js');
const lines = require('stream-chain/utils/lines.js');

const parser = options => {
  let counter = 0;
  const parse = buildParser(options); // local: handles reviver, errorIndicator, checkErrors
  return gen(fixUtf8Stream(), lines(), string => {
    if (!string) return none;
    const value = parse(string);
    return value === undefined ? none : {key: counter++, value};
  });
};
```

The `errorIndicator` adapter is the only stream-json-specific logic.

### Tier 3 — Complex (careful rewrite)

#### `stringer.js` → `flushable` function

The `Stringer` is the most complex class (156 LOC). It has:

- Stateful depth tracking
- `_prev` token tracking for comma insertion
- `useValues` / `useKeyValues` / `useStringValues` / `useNumberValues` flags
- `makeArray` mode with special `_arrayTransform` / `_arrayFlush`
- `skipValue` sub-state for skipping streamed values when using packed values

Rewrite as a `flushable` function:

```js
const stringer = options => {
  // ... initialize state (depth, prev, values flags, makeArray)
  return flushable(chunk => {
    if (chunk === none) {
      // flush: if makeArray, emit endArray
      return makeArray ? ']' : none;
    }
    // ... same transform logic, but return string instead of this.push()
  });
};
stringer.asStream = options => asStream(stringer(options), {writableObjectMode: true, readableObjectMode: false});
```

The core logic is the same `_transform` method but returning values instead of calling `this.push()`. The `skipValue` sub-state becomes an internal flag in the closure.

#### `utils/verifier.js` → `flushable` function

The `Verifier` is 411 LOC with a complex regex-based state machine in `_processBuffer`. It currently extends `Writable` but only validates — it produces no output. Functionally:

```js
const verifier = options => {
  // ... initialize state machine
  return flushable(chunk => {
    if (chunk === none) {
      // validate final state
      return none;
    }
    buffer += chunk;
    validate(buffer); // throws on invalid JSON
    return none; // produces no output
  });
};
verifier.asStream = options => {
  const stream = new Writable({
    ...options,
    write(chunk, _, callback) {
      try {
        fn(chunk);
        callback(null);
      } catch (e) {
        callback(e);
      }
    },
    final(callback) {
      try {
        fn(none);
        callback(null);
      } catch (e) {
        callback(e);
      }
    }
  });
  return stream;
};
```

The `_processBuffer` logic stays identical — it's just moved from a method override into a closure. The Writable wrapper is only needed for the `asStream()` form.

---

## Interface compatibility

All rewritten modules follow the same pattern established by `parser.js`:

| Module          | `fn(options)` returns                          | `fn.asStream(options)` returns |
| --------------- | ---------------------------------------------- | ------------------------------ |
| `stringer`      | `flushable` function (for `chain()`)           | `Duplex` stream                |
| `emitter`       | `Writable` stream (pattern exception)          | same (identity)                |
| `batch`         | `flushable` function (for `chain()`)           | `Duplex` stream                |
| `verifier`      | `gen` pipeline (for `chain()`)                 | `Duplex` stream                |
| `jsonlParser`   | `gen` pipeline (for `chain()`)                 | `Duplex` stream                |
| `jsonlStringer` | `Transform` stream (delegates to stream-chain) | same (identity)                |

**Key pattern:** Each module exports:

1. A **factory function** returning a plain function for `chain()` — the primary API
2. A `.asStream()` method returning a Node stream — for `.pipe()` usage
3. A named alias (e.g., `.stringer()`, `.verifier()`) as a convenience

`.make()` has been removed. This matches the pattern of `parser.js` and `disassembler.js`.

---

## Web Streams readiness

After the functional rewrite, adding Web Streams support would be mechanical:

```js
// Future: src/web.js (or per-module .web.js)
const asWebStream = fn =>
  new TransformStream({
    transform(chunk, controller) {
      const result = fn(chunk);
      if (result !== none) {
        if (isMany(result)) getManyValues(result).forEach(v => controller.enqueue(v));
        else controller.enqueue(result);
      }
    },
    flush(controller) {
      const result = fn(none);
      if (result !== none) {
        if (isMany(result)) getManyValues(result).forEach(v => controller.enqueue(v));
        else controller.enqueue(result);
      }
    }
  });
```

A single `asWebStream()` utility (counterpart of `asStream()`) would adapt every functional module to Web Streams. **This is the payoff of the functional rewrite.**

---

## Migration order

Recommended order based on dependency, complexity, and impact:

| Order | Module                 | Tier | Pattern                                  | Rationale                                                |
| ----- | ---------------------- | ---- | ---------------------------------------- | -------------------------------------------------------- |
| 1 ✅  | `jsonl/parser.js`      | 2    | `gen()` pipeline                         | Removes `Utf8Stream` dependency, enables its deprecation |
| 2 ✅  | `jsonl/stringer.js`    | 1    | Delegates to stream-chain                | Trivial delegation                                       |
| 3 ✅  | `utils/utf8-stream.js` | 1    | Deprecated                               | Deprecate after jsonl/parser is done                     |
| 4 ✅  | `utils/batch.js`       | 1    | `flushable` + `asStream()`               | Wraps stream-chain batch                                 |
| 5 ✅  | `stringer.js`          | 3    | `flushable` + `asStream()`               | Perfect pattern fit, complex but self-contained          |
| 6 ✅  | `utils/verifier.js`    | 3    | `gen(fixUtf8, flushable)` + `asStream()` | Composes with fixUtf8Stream, eliminates StringDecoder    |
| 7 ✅  | `emitter.js`           | 2    | Factory → Writable (exception)           | No functional form — events require stream reference     |
