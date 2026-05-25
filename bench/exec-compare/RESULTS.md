# Executor comparison — published `applyFns` vs unified `exec()`

End-to-end stream-json pipelines measured against two stream-chain executors:

- **baseline** — published `stream-chain@4.1.0` (async `applyFns` in the stream wrappers)
- **linked** — unpublished `~/Open/stream-chain` HEAD (`b69f874`), the unified value-or-promise `exec()` that `fun()`/`gen()`/`asStream`/`asWebStream` adapt over

Goal: the real-document number that the stream-chain executor work was waiting on before a publish-or-not decision (see `projects/stream-chain/design/sync-when-possible-executor` in the vault).

## Verdict

**Do not publish the new executor on the strength of stream-json.** It is a **23–48% regression** on stream-json's SAX token pipelines and only ~6% faster on the JSONL whole-object path. This is the opposite direction from stream-chain's synthetic executor benchmarks (`asStream` ~26% faster there) — the synthetic did not model stream-json's actual workload.

## Numbers

`node`, `BENCH_COUNT=2000` (~0.31 MB JSON / 0.31 MB JSONL), nano-bench `-s 50`. Median per-op (whole-document) wall-time. Each figure is the representative median of 3 runs; runs were tight (see Reproducibility).

| Workflow | Baseline (`applyFns`) | Linked (`exec()`) | Δ time | Direction |
| --- | ---: | ---: | ---: | --- |
| **W1** parse → stringify (tokens) | 96 ms | 142 ms | **+48%** | 🔴 slower |
| **W2** parse → map → stringify (token fn) | 116 ms | 162 ms | **+40%** | 🔴 slower |
| **W3** streamArray → map → disassemble → stringify | 159 ms | 195 ms | **+23%** | 🔴 slower |
| **W4** jsonl → map (objects) | 5.07 ms | 4.76 ms | **−6%** | 🟢 faster |

The inner confidence bounds (the `−` side, i.e. the fast floor) do not overlap between the two builds for W1/W2/W3 — baseline floors ~92/108/148 ms, linked floors ~126/151/183 ms — so the regression is not measurement noise.

## Reading the split

The three regressing workflows (W1–W3) are all **SAX token streams**: stream-json's `parser()` is `gen(fixUtf8Stream(), jsonParser())`, a `many()`-heavy generator that emits one token object per primitive — tens of thousands of tokens for this document, millions for a large file. W4 is the **whole-object** path (`jsonlParser()` returns one assembled object per line), which produces ~3 orders of magnitude fewer items through the executor.

The regression scales with **token cardinality through the executor boundary**, and the one path with low cardinality is the one that improved. That points the finger at the new path's **per-item overhead** — the gen push→pull bridge parks a handoff promise per surviving output, and `asStream`'s `exec`-driven push returns a promise for backpressure per item. stream-chain's synthetic `bench/json-exec/` measured a simpler, lower-cardinality fn-list pipeline and so reported the executor as a net win; on a high-cardinality `many()`-heavy generator it is a net loss here. **This is a hypothesis, not a decomposition** — confirm in stream-chain with a `nano-bench` that varies items-per-input and isolates (a) native-`async function*` gen vs the bridge and (b) `applyFns` push vs `exec` push, before acting.

## Reproducibility

Across 3 baseline runs and 3 linked runs the medians were stable:

- baseline W1: 96.2 / 99.3 / 96.3 ms · W2: 115.7 / 116.6 / 113.1 · W3: 159.3 / 158 / 153.7 · W4: 5.07 / 5.06 / 4.97
- linked   W1: 144 / 143 / 141 ms · W2: 161.5 / 163 / 161 · W3: 197 / 196.3 / 193 · W4: 4.69 / 4.87 / 4.73

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

# 4. restore — do NOT use `npm unlink`: it strips the dependency from
#    package.json. Restore the committed files and reinstall instead.
git checkout -- package.json package-lock.json
npm install
npm unlink -g stream-chain   # tidy the global link
```

`pipelines.js` prints which executor it resolved to on stderr — confirm it before trusting a run.
