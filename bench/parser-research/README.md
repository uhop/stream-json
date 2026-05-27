# parser-research

Throwaway/experimental micro-benchmarks for the core JSON parser perf work
(`src/core/parser.js`). Safe to delete once the optimization work settles, or
keep as regression baselines. Numbers below are machine-relative (Node 26, one
dev host); **ratios are the signal**, not absolute MB/s.

## `parser-sync.js` — sync token-production baseline (KEEP)

Drives the bare `jsonParser()` flushable directly (buffer in → `many()` out,
consumed synchronously), with **zero** stream-chain drain. This is the number
parser-internal optimizations actually move, and the regression baseline.

    npx nano-bench bench/parser-research/parser-sync.js

Baseline (1.071 MB mixed dataset, 5000 objects):

| mode | tokens | ms/parse | MB/s |
| --- | --- | --- | --- |
| default (pack+stream) | 577,745 | ~66 | **16.2** |
| pack-only (`streamValues:false`) | 170,002 | ~52 | 20.5 |
| stream-only (`packValues:false`) | 457,745 | ~60 | 17.7 |
| `JSON.parse` (ceiling, same machine) | — | ~5.7 | **186.8** |

**Headline:** sync parsing is ~11.5× slower than `JSON.parse`. The cost is
scanning + tokenization, NOT the stream-chain drain (drain is only a ~1.5×
factor on top of this). Profiling (`--prof`): ~all time is the `parser.js:82`
hot loop — state-machine dispatch + regex exec + token allocation. Biggest
single regex: the string body pattern (~11% of samples). GC ~14% (token churn).

## `dispatch-bench.js` — dispatch + classification mechanisms

    npx nano-bench bench/parser-research/dispatch-bench.js -e dispatch
    npx nano-bench bench/parser-research/dispatch-bench.js -e classify

### dispatch (state-machine `switch` strategies) — NEGATIVE result

Over a realistic ordered state-visit sequence (~250K visits), pure dispatch:

| strategy | median | vs switch-str |
| --- | --- | --- |
| switch on string (orig order) | ~780μs | — |
| switch on string (hot-first) | ~750μs | ~5% faster |
| **switch on int (enum)** | ~830μs | ~5% **slower** |
| array of functions (`fns[id]()`) | ~515μs | ~34% faster |

Conclusions:
- **Int-switch is NOT jump-tabled into a win** — it's slightly slower than the
  string switch (string literals are interned → cheap pointer compares). The
  "dense int switch → O(1) jump table" assumption does not pay here.
- Reordering cases hot-first buys only ~5% — the original order is already
  roughly frequency-sorted, and dispatch isn't compare-bound.
- Array-of-functions wins on *dispatch overhead alone* (~34%), BUT the handlers
  here just `return const`. Real state handlers must read/mutate shared parser
  state (buffer, index, tokens[], accumulator, expect, parent, stack); as
  separate functions those locals become heap/closure accesses, which likely
  erases the dispatch win.
- **Most important:** in the real parser one state visit costs ~190ns; dispatch
  is ~2–3ns of that → **dispatch is ~1–2% of parse time.** Restructuring the
  switch is low-ROI. Avenue dropped.

### classify (value-start: regex alternation vs charCodeAt) — STRONG result

Classifying the next value-start (`"` `{` `[` `-` digit `true`/`false`/`null`):

| strategy | vs charcode |
| --- | --- |
| regex `/[…]\|true\|…/y` then check `match[0]` | ~21× slower |
| regex with capture groups `/(…)\|(…)/y` + linear group scan | ~27× slower |
| **`charCodeAt(i)` + int switch** | **1× (baseline)** |

Conclusions:
- **`charCodeAt` dispatch is ~21× cheaper** than the alternation regex at the
  classification step. Replacing the structural-state regexes (`value1`,
  `colon`, `comma`, `key1`) with `charCodeAt` + switch (whitespace skipped
  separately) is a confirmed high-leverage lever.
- **Capture groups are a dead end:** `/(a)|(b)|(c)/` + linear group scan is
  *slower* (~22%) than plain alternation + `match[0]`. There is no standard way
  to make a regex report which alternative fired without scanning; charCodeAt
  sidesteps the question entirely.

## `parser-int.js` + `parser-state-compare.js` — string vs int state (NEGATIVE)

`make-parser-int.mjs` regenerates `parser-int.js`, a mechanically-transformed
copy of `src/core/parser.js` whose `expect` states are integer constants instead
of strings (the parser historically used int enums before switching to strings).
`parser-state-compare.js` verifies the two produce **byte-identical token
streams** (11 checks: all option modes × {one-chunk, 1-char, 3-char, 64k}
chunkings + edge cases: negatives, exponents, escapes, unicode, bools/null,
empties, nesting), then benchmarks default mode on the 1 MB dataset.

    node bench/parser-research/make-parser-int.mjs            # (re)generate parser-int.js
    npx nano-bench bench/parser-research/parser-state-compare.js

Result: **no statistically significant difference** (string ~83ms vs int ~88ms
median; int nominally slower, consistent with the isolated dispatch result, but
within noise). Confirms in the REAL parser what the dispatch micro-bench implied:
the string↔int state representation choice does not matter for throughput.

## parser2 / parser3 / parser-compare — fast-path parsers (STRONG result)

Two experimental parsers vs the current `src/core/parser.js`, generated/written
to test the two levers from the research:

- **`parser3.js`** = current parser + whole-string / whole-key / whole-number
  **fast paths** (one regex match → one set of tokens), generated by
  `make-parser3.mjs`. The proven incremental machine is copied verbatim and used
  as fallback for escapes, long (>256) strings, and lexemes that abut the buffer
  tail. Isolates the fast-path win.
- **`parser2.js`** = `charCodeAt` structural classification + whitespace skip +
  the same fast paths; reuses `patterns.value1` only for `true`/`false`/`null`,
  and falls back to the verbatim incremental string/number regex states.
  Isolates the `charCodeAt`-classify win on top of the fast paths.

`parser-compare.js` runs correctness first (throws before benchmarking):

    npx nano-bench bench/parser-research/parser-compare.js

**Correctness: 1610 equivalence checks, 0 mismatches** — every variant produces
the same *normalized* token stream as the current parser (normalized = adjacent
stringChunk/numberChunk merged, since chunk granularity is input-chunking-
dependent), across 30+ docs × 4 option modes × 5 chunkings (one/1ch/3ch/7ch/64ch)
+ jsonStreaming docs + a malformed/incomplete battery (error-parity).

**Perf (1.071 MB, default mode; medians, noisy ±, ratios are the signal):**

| parser | ms/parse | ≈ MB/s | vs current |
| --- | --- | --- | --- |
| current (regex classify + regex str/num) | ~82–85 | ~13 | — |
| parser3 (regex + fast paths) | ~49–53 | ~21 | **~1.6×** |
| parser2 (charCodeAt + fast paths) | ~39–46 | ~24 | **~1.8–2.2×** |

(`JSON.parse` ceiling on this machine ~187 MB/s.) Ordering is stable and
significant across runs: fast paths alone buy ~1.6×; `charCodeAt` structural
classification adds another ~1.1–1.35× on top. Both preserve exact token
semantics and accept/reject behavior. Regenerate parser3 after editing the base
parser: `node bench/parser-research/make-parser3.mjs`.

### parser2b.js — charCodeAt string-body scan (generated by make-parser2b.mjs)

parser2 still used a regex (`shortString`) for the string/key fast-path body.
parser2b replaces it with a `charCodeAt` scan: walk to the closing `"`, bail to
the incremental machine on `\` / control char / >256. Isolates regex-vs-
charCodeAt for the *string body* (a character-class run match, unlike the
alternation classify).

| parser | median (m=150) | vs current |
| --- | --- | --- |
| current | ~82 | — |
| parser3 (regex+fast) | ~57 | ~1.45× |
| parser2 (charCodeAt classify + regex string) | ~47 | ~1.74× |
| **parser2b (charCodeAt string scan)** | ~44 | **~1.9×** |

parser2b is **statistically significantly** faster than parser2 by ~7–11%
(run-dependent). Smaller than the structural-classify win because the string
body regex is already a tight native class-run loop — the gain is mostly the
per-call regex-engine *entry* overhead removed (~90K string lexemes/parse), not
the scanning itself. Token semantics unchanged (verified in parser-compare.js).

### parser2c.js — escape-aware string scan (generated by make-parser2c.mjs)

parser2b bailed escaped strings to the incremental regex machine. parser2c
decodes escapes inline in the charCodeAt scan (`\b\f\n\r\t\"\\\/` + `\uXXXX`,
building the value from run-slices), bailing only on incomplete-in-buffer (wait)
or genuinely invalid escapes (let the incremental machine produce the canonical
error). The 256 cap is dropped too — any fully-in-buffer string fast-paths now.

| dataset | current | parser2b (regex fallback) | parser2c (charCodeAt escapes) |
| --- | --- | --- | --- |
| no-escape (default) | ~77 | ~42 | ~40 (tied with 2b — **no regression**) |
| escape-heavy | ~51 | ~41 (1.23×) | **~32 (1.56×, 27% faster than 2b)** |

The point: parser2c **dominates or ties parser2b everywhere** — free on the
common no-escape path, materially faster where escapes appear. Total correctness:
**3878 equivalence checks, 0 mismatches** (5-way, incl. escape docs split at
every boundary). This is the "widen the front cheaply" principle in action: the
escape fast path's fallback is free, so it costs nothing to add and only helps.

### parser2d.js — charCodeAt number scan (REJECTED — regex was faster)

parser2c still used the `numberFull` regex for the number fast path. parser2d
replaces it with a hand-rolled `charCodeAt` number scan (JSON number grammar).
**Result: a regression.** On a number-heavy array-of-numbers payload, parser2c
(regex) ~10.5 ms vs parser2d (charCodeAt) ~11.5 ms — regex ~10% faster
(statistically significant); on default data parser2d is the slowest char-scanner.
4783 checks / 0 mismatches, so it's correct — just slower. Kept as a recorded
negative result; **parser2c is the endpoint.**

Refined thesis (the important takeaway):
- `charCodeAt` **>> regex for alternation / dispatch** (structural classification):
  ~21× at the micro level, ~1.7× in the parser. (parser2)
- `charCodeAt` **≈ slightly-better than regex for a *simple* sequence scan**
  (string body = "advance to quote"): ~9%, mostly saved regex-call entry overhead. (parser2b/2c)
- `charCodeAt` **loses to regex for a *complex* sequence grammar** (JSON number =
  sign/int/leading-zero/fraction/exponent): Irregexp compiles it to a tight native
  DFA that beats branchy JS. (parser2d)
- The dominant win is the **whole-lexeme fast path itself** (collapse per-char
  micro-states → one match → one token): ~3× on numbers regardless of mechanism.

So: use `charCodeAt` for classification and trivial scans; keep regex for
structured sequence matches. parser2c embodies exactly that split.

### Dataset lexeme composition (matters for weighting)

This 1 MB object-heavy dataset: **strings 69.2%** of scalar tokens (of which
HALF are object keys — 65K keys vs 25K string values), **numbers 23.1%**, bool
7.7%, null 0%. So the string/key fast path has the highest leverage *here*. This
is data-shaped: an array-of-numbers payload would invert it (numbers dominant,
few keys). A generic library can't assume a shape — keep a broad optimization
front (string + number + structural fast paths, with fallback that never
regresses long/escaped strings, bool/null), don't tune only "the one case."
