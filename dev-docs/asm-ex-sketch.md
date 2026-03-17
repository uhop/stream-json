# FlexAssembler — Assembler with custom containers

File: `src/utils/flex-assembler.js` (+ `.d.ts`)
Export: `flexAssembler`

## Idea

`Assembler` creates plain `{}` on `startObject` and `[]` on `startArray`, then adds properties/elements.
`FlexAssembler` lets the user substitute custom containers (Map, Set, custom classes, etc.) at specific
paths, while falling back to standard behavior elsewhere.

## Design decisions

- **Name:** `flexAssembler` (file: `utils/flex-assembler.js`).
- **Standalone clone** of `Assembler` — not a subclass. New logic (path tracking, rule matching) must not
  affect the hot path of the original Assembler.
- **Reviver composes** with custom containers. Reviver runs on each primitive value first; the (possibly
  transformed) result is then passed to the adder.
- **Root-level** custom objects are supported (filter matches on empty path `[]`).

## Rules

Rules are quadruplets: `{filter, create, add, finalize?}`.

There are **two separate rule arrays** — one for objects, one for arrays — because adder signatures differ:

### Object rules

```js
{
  filter,                          // string | RegExp | (path => boolean)
  create: (path) => new Map(),     // called at startObject
  add: (container, key, value) => container.set(key, value),
  finalize: (container) => container  // optional, called at endObject
}
```

### Array rules

```js
{
  filter,                          // string | RegExp | (path => boolean)
  create: (path) => new Set(),     // called at startArray
  add: (container, value) => container.add(value),
  finalize: (container) => container  // optional, called at endArray
}
```

- **`filter`** — same format as `src/filters/filter-base.js`: a string (joined path), a RegExp, or
  `(path) => boolean` where `path` is an array of strings (keys) and numbers (array indices).
- **`create(path)`** — receives the current path, returns the new container.
- **`add`** — object: `(container, key, value)`, array: `(container, value)`. Array adders that need
  an index should maintain it themselves.
- **`finalize(container)`** — optional. Called when the container is complete (`endObject`/`endArray`).
  Return value replaces the container (allows conversion, freezing, validation).
  If absent, the container is used as-is.

The first matching rule wins. If nothing matches, standard `{}`/`[]` behavior is used.

### `pathSeparator`

For string and RegExp filters, the path array is joined using `pathSeparator` (default: `'.'`),
consistent with filter-base. The `pathSeparator` option is set once on the FlexAssembler instance.

## Options

```js
const asm = new FlexAssembler({
  objectRules: [...],    // array of object rules
  arrayRules: [...],     // array of array rules
  pathSeparator: '.',    // default: '.'
  reviver: fn,           // optional, composes with custom containers
  numberAsString: false  // optional, same as Assembler
});
```

## API surface

Same as `Assembler`:

- `new FlexAssembler(options)` — constructor
- `FlexAssembler.connectTo(stream, options)` — static factory
- `flexAssembler(options)` — plain factory
- `asm.connectTo(stream)` — attach to token stream, emit `'done'`
- `asm.tapChain` — function for use in `chain()`
- `asm.current`, `asm.key`, `asm.done`, `asm.depth`, `asm.path`
- `asm.consume(chunk)`, `asm.dropToLevel(level)`
- Extends `EventEmitter`, emits `'done'`

## Implementation

### Stack split

The current Assembler interleaves objects and keys in one array: `[obj0, key0, obj1, key1, ...]`.

FlexAssembler splits this into:

- **`objectStack`** — stack of `{container, rule}` (or just `container` when no rule matched).
- **`keyStack`** — stack of keys. This doubles as the **path array** passed to filter functions.

The `keyStack` is always current — no need to recompute the path on each `startObject`/`startArray`.

### Rule matching flow

On `startObject`:

1. Push `this.current` (with its active rule) onto `objectStack`.
2. Push `this.key` onto `keyStack`.
3. Evaluate `objectRules` against `keyStack` (the path). First match wins.
4. If matched: `this.current = rule.create(keyStack)`, store `rule` with the stack entry.
5. If no match: `this.current = {}`.
6. `this.key = null`.

On `endObject`:

1. If matched rule has `finalize`: `this.current = rule.finalize(this.current)`.
2. Pop from `objectStack` and `keyStack`, restore parent, call `_saveValue(this.current)`.

`startArray` / `endArray`: same logic using `arrayRules`.

### \_saveValue with custom containers

When adding a value to the current container, `_saveValue` must check which rule is active:

- **No rule (default):** `current[key] = value` for objects, `current.push(value)` for arrays.
- **Object rule:** `rule.add(current, key, value)`.
- **Array rule:** `rule.add(current, value)`.

This means `_saveValue` needs to know the current rule and whether it's an object or array rule.
Simplest approach: store `{container, rule, isArray}` on the object stack, and keep
`this.rule` / `this.isArray` for the current level.

### Reviver composition

When reviver is active, the flow for each value is:

1. Reviver transforms the value: `value = reviver.call(current, key, value)`.
2. If `undefined`, skip (delete semantics).
3. Otherwise, the adder places it: `rule.add(current, key, value)` or default assignment.

Root reviver call at `endObject`/`endArray` works the same as in Assembler.

### Filter pre-compilation

At construction time:

- String filters → `stringFilter(str, separator)` (same as filter-base).
- RegExp filters → `regExpFilter(re, separator)`.
- Function filters → used as-is.

As an optimization: if all filters are string/RegExp based, pre-build the joined path string
incrementally (push/pop segments) rather than joining the full array on each check.

## Usage examples

### All objects as Maps

```js
const asm = new FlexAssembler({
  objectRules: [
    {
      filter: () => true,
      create: () => new Map(),
      add: (map, key, value) => map.set(key, value)
    }
  ]
});
```

### Arrays at specific path as Sets

```js
const asm = new FlexAssembler({
  arrayRules: [
    {
      filter: 'data.tags',
      create: () => new Set(),
      add: (set, value) => set.add(value)
    }
  ]
});
```

### Frozen objects

```js
const asm = new FlexAssembler({
  objectRules: [
    {
      filter: () => true,
      create: () => ({}),
      add: (obj, key, value) => {
        obj[key] = value;
      },
      finalize: obj => Object.freeze(obj)
    }
  ]
});
```

### Compose with reviver

```js
const asm = new FlexAssembler({
  objectRules: [
    {
      filter: () => true,
      create: () => new Map(),
      add: (map, key, value) => map.set(key, value)
    }
  ],
  reviver: (key, value) => {
    if (/Date$/.test(key) && typeof value === 'string') return new Date(value);
    return value;
  }
});
```

## Execution plan

### Phase 1: Implementation

1. **`src/utils/flex-assembler.js`** — clone Assembler, split stack, add rule matching, custom
   create/add/finalize, reviver composition. Export `FlexAssembler` class and `flexAssembler` factory.
2. **`src/utils/flex-assembler.d.ts`** — TypeScript declarations.

### Phase 2: Tests

3. **`tests/test-flex-assembler.mjs`** — runtime tests:
   - Default behavior (no rules) matches Assembler output.
   - Object rules: Map, custom class, frozen objects.
   - Array rules: Set, custom list.
   - Root-level custom object.
   - Nested custom objects (Map containing a Set).
   - Finalize callback.
   - Reviver + custom containers composing.
   - String, RegExp, and function filters.
   - `pathSeparator` option.
   - `numberAsString` option.
   - `tapChain` and `connectTo` usage.
   - `jsonStreaming` with multiple top-level custom objects.
4. **`tests/test-types-flex-assembler.mts`** — typing tests.

### Phase 3: Documentation

5. **`wiki/FlexAssembler.md`** — usage docs, API, options, examples.
6. **Update `wiki/Home.md`** — add FlexAssembler to utilities section.
7. **Update `ARCHITECTURE.md`** — add to project layout, dependency graph, import paths.
8. **Update `AGENTS.md`** — add to project structure and architecture reference.

### Phase 4: Verify

9. `npm test` + `npm run ts-check` + `npm run lint`.
