# Executor comparison — published `applyFns` vs unified `exec()`

End-to-end stream-json pipelines measured against two stream-chain executors:

- **baseline** — published `stream-chain@4.1.0` (async `applyFns` in the stream wrappers)
- **linked** — unpublished `~/Open/stream-chain` HEAD (`b69f874`), the unified value-or-promise `exec()` that `fun()`/`gen()`/`asStream`/`asWebStream` adapt over

Goal: the real-document number that the stream-chain executor work was waiting on before a publish-or-not decision (see `projects/stream-chain/design/sync-when-possible-executor` in the vault).

> **⚠️ VERDICT WITHDRAWN — read `ANALYSIS.md`.** The regression below is an
> **artifact of this benchmark feeding the whole document as one chunk**
> (`Readable.from([wholeString])`). On realistic chunked input
> (`fs.createReadStream`, 64 KB) the new `exec()` is **~18–23% faster** — see
> `file-pipelines.js` / `file-baseline.txt` vs `file-linked.txt`. The
> one-giant-chunk case also exposed a real, fixable O(n) GC bug in
> `exec.nextMany`; with the 6-line fix the new executor beats the old at _every_
> chunk size. Full diagnosis + the fix: **`ANALYSIS.md`**. The numbers below are
> kept as the record of the misleading first round.

## Verdict (SUPERSEDED — see banner above and ANALYSIS.md)

~~Do not publish the new executor on the strength of stream-json.~~ The
**23–48% "regression"** measured here is real _only_ when the entire document
arrives as a single chunk, which `Readable.from([str])` does and real I/O does
not. It traced to an O(n) promise+closure chain in `exec.nextMany` (length ∝
`many()` size ∝ chunk size) → GC pressure. Representative chunked I/O shows the
new executor faster; the fix makes it uniformly faster.

## Numbers

`node`, `BENCH_COUNT=2000` (~0.31 MB JSON / 0.31 MB JSONL), nano-bench `-s 50`. Median per-op (whole-document) wall-time. Each figure is the representative median of 3 runs; runs were tight (see Reproducibility).

| Workflow                                           | Baseline (`applyFns`) | Linked (`exec()`) |   Δ time | Direction |
| -------------------------------------------------- | --------------------: | ----------------: | -------: | --------- |
| **W1** parse → stringify (tokens)                  |                 96 ms |            142 ms | **+48%** | 🔴 slower |
| **W2** parse → map → stringify (token fn)          |                116 ms |            162 ms | **+40%** | 🔴 slower |
| **W3** streamArray → map → disassemble → stringify |                159 ms |            195 ms | **+23%** | 🔴 slower |
| **W4** jsonl → map (objects)                       |               5.07 ms |           4.76 ms |  **−6%** | 🟢 faster |

The inner confidence bounds (the `−` side, i.e. the fast floor) do not overlap between the two builds for W1/W2/W3 — baseline floors ~92/108/148 ms, linked floors ~126/151/183 ms — so the regression is not measurement noise.

## Reading the split

The three regressing workflows (W1–W3) are all **SAX token streams**: stream-json's `parser()` is `gen(fixUtf8Stream(), jsonParser())`, a `many()`-heavy generator that emits one token object per primitive — tens of thousands of tokens for this document, millions for a large file. W4 is the **whole-object** path (`jsonlParser()` returns one assembled object per line), which produces ~3 orders of magnitude fewer items through the executor.

My first read of this split blamed the gen push→pull bridge's per-item handoff promise. **That was wrong** — the bridge isn't even on this path (fused fn-lists run through `exec.next` directly in `asStream`, not through `gen()`'s async-generator). The real cause, confirmed by profiling and a chunk-size sweep, is an O(n) promise+closure chain in `exec.nextMany` that only triggers when one `many()` array is huge — which happens precisely because these benchmarks feed the whole document as a single chunk. **See `ANALYSIS.md` for the confirmed diagnosis, the GC evidence, and the fix.**

## Reproducibility

Across 3 baseline runs and 3 linked runs the medians were stable:

- baseline W1: 96.2 / 99.3 / 96.3 ms · W2: 115.7 / 116.6 / 113.1 · W3: 159.3 / 158 / 153.7 · W4: 5.07 / 5.06 / 4.97
- linked W1: 144 / 143 / 141 ms · W2: 161.5 / 163 / 161 · W3: 197 / 196.3 / 193 · W4: 4.69 / 4.87 / 4.73

Raw captured reports: `baseline.txt`, `linked.txt`.

## How to run

```bash
./run.sh          # baseline → link → linked → restore, prints both reports
```

Or by hand:

```bash
# 1. baseline (published stream-chain from node_modules)
BENCH_COUNT=2000 npx nano-bench -s 50 bench/exec-compare/pipelines.js

# 2. link the unpublished build
(cd ~/Open/stream-chain && npm link) && npm link stream-chain

# 3. linked
BENCH_COUNT=2000 npx nano-bench -s 50 bench/exec-compare/pipelines.js

# 4. restore — just reinstall; `npm i` puts the registry version back over
#    the symlink. Do NOT use `npm unlink stream-chain`: it strips the
#    dependency out of package.json (`npm link` itself never touches it).
npm i
```

`pipelines.js` prints which executor it resolved to on stderr — confirm it before trusting a run.
