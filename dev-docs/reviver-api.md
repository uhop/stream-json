# New reviver API — implementation plan

The `JSON.parse()` reviver gained `this` binding and a third `context` parameter. We implement a scaled-down version: `this` binding only, no `context`.

See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse

## What changed

`src/assembler.js` — `_saveValueWithReviver` now calls `reviver.call(container, key, value)`:

- **Object properties:** `this` = partially assembled containing object.
- **Array elements:** `this` = the array.
- **Root primitives:** `this` = `{'': value}`, key = `''`.
- **Root objects/arrays:** `this` = `{'': value}`, key = `''`. The reviver can transform or replace the root value.

Also: `stringValue` is aliased to `_saveValue` on the prototype. When a reviver is active, both are swapped to `_saveValueWithReviver`.

## Deviations from spec

1. **`this` is partially assembled.** Node's `JSON.parse` gives the reviver a fully assembled containing object. Ours has only the properties seen so far. Intentional for streaming performance.
2. **No `context` parameter.** The spec passes `{source}` with raw text for primitives. We omit it — adding it later is backward-compatible.

## What needs to be done

### 1. Tests — `tests/test-assembler.mjs` (high priority)

Add a test exercising `this` binding with a regular function (existing tests use arrow functions which ignore `this`). Verify that `this` is the containing object for properties and `{'': value}` for root primitives.

### 2. TypeScript — `src/assembler.d.ts` (low priority, optional)

The `reviver` type is currently `(key: string, value: any) => any`. Could optionally add `this: any` parameter to reflect the new binding, but it's not required — callers using arrow functions or ignoring `this` are unaffected.

### 3. Wiki — `wiki/Assembler.md` (medium priority)

Add a brief note that the reviver is called with `this` set to the containing object, and list the deviations from spec (partially assembled `this`, no root call for objects/arrays, no `context`).

### 4. No changes needed

- **`src/jsonl/parser.js`** — delegates to `JSON.parse()` which has the full spec natively.
- **`src/jsonl/parser.d.ts`** — same; `JSON.parse` handles `this`/`context` internally.
- **`src/streamers/stream-base.js`** — passes options through to `Assembler`. Inherits new behavior.
- **`src/streamers/stream-base.d.ts`** — extends `Assembler.AssemblerOptions`. No change needed.
- **Streamer tests** — existing reviver tests in `test-stream-array.mjs` and `test-stream-object.mjs` use arrow functions; they continue to work and test the reviver-as-transform use case.

### 5. AI docs (low priority)

Briefly mention `this` binding behavior in `AGENTS.md` and `llms-full.txt` Assembler sections if/when they are next updated.
