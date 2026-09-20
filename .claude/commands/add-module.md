---
description: Checklist for adding a new component or utility to stream-json
---

# Add a New Module

3.x is ESM-only with a **tri-tree** layout, so a portable component is three files, not one: a pure factory under `src/core/`, a Node wrapper at `src/<name>.js` that attaches both `.asStream` and `.asWebStream`, and a Web wrapper at `src/web/<name>.js` that attaches only `.asWebStream`. Read `ARCHITECTURE.md` § Project layout before starting; `AGENTS.md` carries the rules this checklist assumes.

Pick the case below, then run the common steps.

## Case 1 — a portable component (`batch`, `verifier`, `with-parser`, a parser, a stringer)

1. `src/core/<name>.js` — the pure factory. No `node:*` imports, no `.asStream` / `.asWebStream`; it may import `stream-chain/core` primitives only. Start the file with `// @ts-self-types="./<name>.d.ts"`.
2. `src/core/<name>.d.ts` — hand-written declarations, kept in sync with the `.js`.
3. `src/<name>.js` — the Node wrapper: import the core factory, attach `.asStream` (via `asStream`) and `.asWebStream`. Mirror its `.d.ts`.
4. `src/web/<name>.js` — the Web wrapper: attach `.asWebStream` only, so a browser bundle pulls no Node-stream code. Mirror its `.d.ts`.
5. Export shape: `export default X` **plus** `export {X}`, and any type aliases through `export type {…}`.

## Case 2 — a filter (`pick`, `ignore`, `replace`, `filter`)

1. `src/core/filters/<name>.js` built on `filterBase` from `./filter-base.js`, choosing `specialAction` / `defaultAction` / `nonCheckableAction` and an optional `transition`. Path matching, `maxDepth`, and the options bag come from the base — do not reimplement them.
2. Wrappers per case 1, plus the parser-bundling helpers built on `with-parser`: the Node wrapper attaches `.withParser()`, `.withParserAsStream()`, and `.withParserAsWebStream()`, the Web wrapper only `.withParser()` and `.withParserAsWebStream()`. Each injects `{packKeys: true, ...options}`, since key-based paths need packed keys from upstream. Both wrappers end with `export * from '<core module>'` so the core's types and named exports stay reachable.
3. Add the row to `ARCHITECTURE.md` § Filters' action table.

## Case 3 — a streamer (`streamArray`, `streamObject`, `streamValues`)

1. `src/core/streamers/<name>.js` built on `streamBase` from `./stream-base.js`, defining `push`, `level`, and optionally `first`.
2. Wrappers and `withParser` variants per case 2. Items are `{key, value}`, generic in the assembled type.
3. Support `objectFilter` for early rejection where it makes sense.

## Case 4 — an internal core module (`path-matcher`)

A helper used only by other `src/core/` modules gets **no** wrapper, **no** wiki page, and **no** `llms.txt` entry. Write `src/core/utils/<name>.js` + `.d.ts`, mark the `.d.ts` "Internal … not part of the public API", and record it in `ARCHITECTURE.md` (layout tree and dependency graph) only. Everything else in the common steps still applies.

## Case 5 — a Node-only file component (`parseFile`, `stringerToFile`, `verifyFile`)

Lives under `src/file/` and is **not** mirrored in `core/` or `web/`, because it uses `node:fs/promises`. Follow case 1's steps 1–2 shape inside `src/file/`, and skip the Web wrapper.

## Common steps

1. **Tests, both substrates.** `tests/node/test-<name>.js` for the Node-flavored entry, and `tests/web/test-<name>.js` as its mirror for anything portable — the web file imports `src/web/<name>.js` and `tests/web-helpers.js`, and must stay browser-safe. Cover normal operation, edge cases, and composition through `chain()` and `parser()`. Property-based tests go through `tape-six-fast-check` (`t.prop`), as `tests/node/test-property-*.js` do.
2. **Typing tests** where the `.d.ts` has consumer-visible generics: `tests/node/test-types-<area>.ts`.
3. **Subpath resolution.** Add the new entry points to `tests/node/test-subpaths.js`.
4. **Browser safety** is asserted automatically: `tests/node/test-browser-safe.js` walks the import graph under `src/core/**` and `src/web/**` and fails on any `node:*` or Node-builtin import.
5. **Wiki page** (skip for case 4): `wiki/<Name>.md`, a link in `wiki/Home.md` under the right group, and the same entry in `wiki/_Sidebar.md`. The wiki is a submodule with its own commit.
6. **AI docs:** `llms.txt` (one line), `llms-full.txt` (options and an example), `AGENTS.md` if the architecture quick reference or a rule changes, and `ARCHITECTURE.md` (layout tree, the relevant table, dependency graph).
7. **A bench** in `bench/<name>.js` when the module has a hot path worth watching, plus its row in `ARCHITECTURE.md` § Benchmark files and a section in `wiki/Benchmarks.md`.
8. **Comments:** only short _why_ markers — a decision, a constraint, an algorithm reference. Never narration of what the code does.
9. **Wiki search index**, after every wiki edit and after the formatter has run: from `wiki/`, `npx wiki-search-index --wiki . --repo uhop/stream-json`.

## Verify

    // turbo

1. `npm test`
   // turbo
2. `npm run test:bun`
   // turbo
3. `npm run test:deno`
   // turbo
4. `npm run ts-test`
   // turbo
5. `npm run ts-check`
   // turbo
6. `npm run js-check`
   // turbo
7. `npm run lint`
