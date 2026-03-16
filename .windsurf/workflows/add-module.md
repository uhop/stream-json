---
description: Checklist for adding a new component or utility to stream-json
---

# Add a New Module

Follow these steps when adding a new component or utility.

## Utility (e.g., `src/utils/foo.js`)

1. Create `src/utils/foo.js` with the implementation.
   - CommonJS (`module.exports`). Use `require()` for imports.
   - One runtime dependency allowed: `stream-chain`. No others.
   - Follow the token protocol if working with parser output.
2. Create `src/utils/foo.d.ts` with hand-written TypeScript declarations.
   - Keep the `.js` and `.d.ts` files in sync.
3. Create `tests/test-foo.mjs` with automated tests (tape-six, ESM):
   - Import the module under test with relative paths.
   - Test normal operation, edge cases, and integration with `chain()` and `parser()`.
4. If the module has a `.d.ts`, add typing tests or verify with `npm run ts-check`.
   // turbo
5. Run the new test: `node tests/test-foo.mjs`
6. Create a wiki page (e.g., `wiki/foo.md`) with usage documentation.
7. Add a link in `wiki/Home.md` under the appropriate section.
8. Update `ARCHITECTURE.md` — add the utility to the project layout tree and dependency graph.
9. Update `llms.txt` and `llms-full.txt` with a description and example.
10. Update `AGENTS.md` if the architecture quick reference needs updating.
    // turbo
11. Verify: `npm test`
    // turbo
12. Verify: `npm run ts-check`
    // turbo
13. Verify: `npm run lint`

## Filter (e.g., `src/filters/foo.js`)

1. Create `src/filters/foo.js` using `filterBase` from `./filter-base.js`.
   - CommonJS (`module.exports`). Use `require()` for imports.
   - Export the factory function, a named export, `.withParser()`, and `.withParserAsStream()`.
2. Create `src/filters/foo.d.ts` with hand-written TypeScript declarations.
3. Create `tests/test-foo.mjs` with automated tests.
4. If the module has a `.d.ts`, verify with `npm run ts-check`.
   // turbo
5. Run the new test: `node tests/test-foo.mjs`
6. Create a wiki page with usage documentation.
7. Add a link in `wiki/Home.md`.
8. Update `ARCHITECTURE.md` — add to project layout, filter table, and dependency graph.
9. Update `llms.txt` and `llms-full.txt`.
10. Update `AGENTS.md` if the architecture quick reference needs updating.
    // turbo
11. Verify: `npm test`
    // turbo
12. Verify: `npm run ts-check`
    // turbo
13. Verify: `npm run lint`

## Streamer (e.g., `src/streamers/stream-foo.js`)

1. Create `src/streamers/stream-foo.js` using `streamBase` from `./stream-base.js`.
   - CommonJS (`module.exports`). Use `require()` for imports.
   - Export the factory function, a named export, `.withParser()`, and `.withParserAsStream()`.
   - Define `push`, `first` (optional), and `level` for `streamBase`.
2. Create `src/streamers/stream-foo.d.ts` with hand-written TypeScript declarations.
3. Create `tests/test-stream-foo.mjs` with automated tests.
4. If the module has a `.d.ts`, verify with `npm run ts-check`.
   // turbo
5. Run the new test: `node tests/test-stream-foo.mjs`
6. Create a wiki page with usage documentation.
7. Add a link in `wiki/Home.md`.
8. Update `ARCHITECTURE.md` — add to project layout, streamer table, and dependency graph.
9. Update `llms.txt` and `llms-full.txt`.
10. Update `AGENTS.md` if the architecture quick reference needs updating.
    // turbo
11. Verify: `npm test`
    // turbo
12. Verify: `npm run ts-check`
    // turbo
13. Verify: `npm run lint`
