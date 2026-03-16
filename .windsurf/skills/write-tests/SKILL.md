---
name: write-tests
description: Write or update tape-six tests for a module or feature. Use when asked to write tests, add test coverage, or create typing tests for stream-json.
---

# Write Tests for stream-json

Write or update tests using the tape-six testing library.

## Steps

1. Read `node_modules/tape-six/TESTING.md` for the full tape-six API reference (assertions, hooks, patterns, configuration).
2. Identify the module or feature to test. Read its source code to understand the public API.
3. Check existing tests in `tests/` for stream-json conventions and patterns.
4. Create or update the test file in `tests/`:
   - Runtime tests use `.mjs` (ESM).
   - Import the module under test with relative paths: `import {parser} from '../src/index.js';`
   - For stream tests, use `chain()` from `stream-chain` to build pipelines.
   - Collect output with `pipeline.on('data', ...)` and verify in `pipeline.on('end', ...)`.
   - Use helpers from `tests/read-string.mjs` and `tests/counter.mjs`.
5. Run the new test file directly to verify: `node tests/test-<name>.mjs`
6. Run the full test suite to check for regressions: `npm test`
   - If debugging, use `npm run test:proc` (runs sequentially, easier to trace issues).
7. Report results and any failures.

## stream-json conventions

- Test file naming: `test-*.mjs` in `tests/`.
- Runtime tests (`.mjs`): ESM imports, `import test from 'tape-six'`.
- Existing tests use `test.asPromise('name', (t, resolve, reject) => { ... })` for stream-based tests.
- New tests may also use `async t => { ... }` when appropriate.
- Common pattern: build a `chain()` pipeline, collect output in an array, verify on `'end'`.
- Tests run on Node and Bun.
