# JSONC Utils

Implementation plan for JSONC (JSON with Comments) support. Spec: https://jsonc.org/

## Design decisions

- **Fork, don't extend.** The JSONC parser is a fork of `src/parser.js`, not a wrapper or extension. Adding JSONC logic to the standard parser would make it marginally slower for the common JSON case. The fork lives in `src/jsonc/` and can diverge freely.
- **Pragmatic round-trip.** Commas and colons are NOT emitted as tokens. The stringer auto-inserts them. This means round-tripping preserves whitespace and comments but normalizes comma/colon placement and drops trailing commas. This keeps the token protocol clean.
- **Downstream compatibility.** All existing components (filters, streamers, assembler, etc.) are compatible with the JSONC parser. They simply ignore tokens they don't recognize (`whitespace`, `comment`). No changes needed to existing components.
- **File naming.** `src/jsonc/stringer.js` (not `stringify.js`) to match the existing `src/stringer.js` and `src/jsonl/stringer.js` convention.

## JSONC Parser

`src/jsonc/parser.js` — forked from `src/parser.js`.

### New tokens

| Token name   | Value                             | Meaning                              |
| ------------ | --------------------------------- | ------------------------------------ |
| `whitespace` | the whitespace characters         | contiguous whitespace between tokens |
| `comment`    | full comment including delimiters | `// ...` (with EOL) or `/* ... */`   |

- `//` comment value includes the end-of-line character(s) (`\n` or `\r\n`). At EOF without a trailing newline, the value contains just `// ...` with no EOL.
- `/* */` comment value includes the `/*` and `*/` delimiters.
- All base tokens from `wiki/Parser.md` are emitted unchanged.

### New options

- `streamWhitespace` — emit `whitespace` tokens. Default: `true`. Set to `false` to skip them (behaves like the standard parser for whitespace).
- `streamComments` — emit `comment` tokens. Default: `true`. Set to `false` to silently consume comments without emitting tokens.

All standard parser options (`packKeys`, `packStrings`, `packNumbers`, `streamKeys`, `streamStrings`, `streamNumbers`, `jsonStreaming`) are supported unchanged.

### Parser changes from `src/parser.js`

1. **Whitespace tokens.** Every state that currently matches `\s{1,256}` and discards it must instead emit `{name: 'whitespace', value: ws}` (when `streamWhitespace` is true).

2. **Comment handling.** In every state where whitespace can appear, also match `//` and `/*`:
   - New state `lineComment`: consume until EOL (include the EOL in the value). Emit `{name: 'comment', value}`.
   - New state `blockComment`: consume until `*/` (include delimiters in the value). Emit `{name: 'comment', value}`.
   - After a comment, return to the previous parsing state.

3. **Trailing commas.** In `arrayStop`/`objectStop`, after matching `,`, transition to `value1` (not `value`) and `key1` (not `key`) respectively. This allows `]`/`}` to follow a comma without error.

4. **Regex changes.** Patterns that currently match `\s{1,256}` as an alternative need to also match `//` and `/*` as comment starters. This likely means splitting the whitespace alternative out and handling it explicitly.

### Export pattern

```js
jsoncParser.asStream = options => asStream(jsoncParser(options), options);
jsoncParser.parser = jsoncParser;
jsoncParser.jsoncParser = jsoncParser;
module.exports = jsoncParser;
```

## JSONC Stringer

`src/jsonc/stringer.js` — forked from `src/stringer.js`.

### Token handling

- Base tokens: output exactly as `src/stringer.js` does (comma auto-insertion, depth tracking, etc.).
- `whitespace` tokens: output `chunk.value` as-is. Do NOT insert a comma before whitespace; do NOT update `prev` (whitespace is transparent to comma logic).
- `comment` tokens: output `chunk.value` as-is. Same transparency rules as whitespace.

The stringer tracks `prevStructural` (ignoring whitespace/comment) for comma insertion logic, so that whitespace/comments between values don't break comma placement.

### Export pattern

```js
jsoncStringer.asStream = options => asStream(jsoncStringer(options), {...options, writableObjectMode: true, readableObjectMode: false});
jsoncStringer.stringer = jsoncStringer;
jsoncStringer.jsoncStringer = jsoncStringer;
module.exports = jsoncStringer;
```

## Files to create

| File                         | Description                                |
| ---------------------------- | ------------------------------------------ |
| `src/jsonc/parser.js`        | JSONC parser (fork of `src/parser.js`)     |
| `src/jsonc/parser.d.ts`      | TypeScript declarations                    |
| `src/jsonc/stringer.js`      | JSONC stringer (fork of `src/stringer.js`) |
| `src/jsonc/stringer.d.ts`    | TypeScript declarations                    |
| `tests/test-jsonc.mjs`       | Runtime tests                              |
| `tests/test-types-jsonc.mts` | Typing tests                               |
| `wiki/jsonc-Parser.md`       | Wiki documentation                         |
| `wiki/jsonc-Stringer.md`     | Wiki documentation                         |

## Files to update

| File              | Change                                          |
| ----------------- | ----------------------------------------------- |
| `wiki/Home.md`    | Add JSONC section with links                    |
| `ARCHITECTURE.md` | Add `src/jsonc/` to layout and dependency graph |
| `AGENTS.md`       | Add JSONC to architecture quick reference       |
| `llms.txt`        | Add JSONC description                           |
| `llms-full.txt`   | Add JSONC description and examples              |

## Tests

JSONC is a superset of JSON, so standard JSON inputs should parse identically (plus whitespace tokens). Test cases:

- **JSON compatibility**: standard JSON produces the same structural tokens as the regular parser
- **Single-line comments**: `// comment\n` → `{name: 'comment', value: '// comment\n'}`
- **Multi-line comments**: `/* comment */` → `{name: 'comment', value: '/* comment */'}`
- **Whitespace tokens**: verify whitespace between elements is captured
- **Trailing commas**: `[1, 2,]` and `{"a": 1,}` parse without error
- **Options**: `streamWhitespace: false` suppresses whitespace tokens; `streamComments: false` suppresses comment tokens
- **Near-round-trip**: parse JSONC → stringify → compare (exact for inputs without trailing commas)
- **Edge cases**: comment-like sequences inside strings (not treated as comments), unterminated block comment (error), `//` at EOF without newline
- **Downstream compatibility**: pipe JSONC parser output through a filter or streamer — unknown tokens are ignored gracefully
