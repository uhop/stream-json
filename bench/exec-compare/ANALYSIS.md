# Why the new `exec()` looked slower — and the real bug behind it

## TL;DR

The "23–48% regression" in the first round (`pipelines.js`, `RESULTS.md`) was an
**artifact of the benchmark feeding the whole document as a single chunk**
(`Readable.from([wholeString])`). On realistic chunked input — `fs.createReadStream`
(64 KB), sockets, gzip — the new `exec()` is **~18–23% faster** end-to-end
(`file-pipelines.js`, real files on disk).

There is, however, a **real latent bug in `exec.nextMany`**: on backpressure it
builds a promise+closure chain whose length is proportional to the `many()` array
it is handed. stream-json's parser emits one `many(tokens)` per input chunk, so the
chain length is proportional to the **chunk size**. With one giant chunk it explodes
into GC pressure; with 64 KB chunks it stays small. A 6-line fix (make `nextMany`
resumable, exactly like `nextGen` already is) removes the chunk-sensitivity and makes
the new executor **uniformly ~17–20% faster than the old one at every chunk size.**

The user called it on the first guess: _"some memory accumulation… proportional to the chunk."_

## The one variable: input chunk size

Same in-memory document, same `parse → stringify` pipeline, fed through a `Readable`
that slices it into fixed-size chunks (`chunk-sweep.js`), median ms/op:

| chunk size                   | OLD `applyFns` | NEW `exec()` | NEW + fix |
| ---------------------------- | -------------: | -----------: | --------: |
| whole (1 chunk)              |            105 |   **147** 🔴 |        84 |
| 256 KB                       |            104 |          121 |        86 |
| 64 KB (≈ `createReadStream`) |            101 |        90 🟢 |        83 |
| 16 KB                        |            102 |        84 🟢 |        82 |
| 4 KB                         |            101 |        83 🟢 |        82 |

- **OLD is flat** — chunk size doesn't matter (~101–105 ms everywhere).
- **NEW is steep** — 147 ms at one chunk, 83 ms at 4 KB. It _crosses over_: slower than
  OLD only at very large chunks, faster at realistic ones.
- **NEW + fix is flat _and_ fast** — ~83 ms everywhere, beating OLD at every size.

`pipelines.js` used one giant chunk → landed on the worst cell. `file-pipelines.js`
(real `createReadStream`) lands on the 64 KB row → the new executor wins. Both
benchmarks were "correct"; the first one just wasn't representative of disk/network I/O.

## The timesink: GC from an O(n) chain in `nextMany`

CPU profiles (`prof/*.cpuprofile`, via `prof-summary.mjs`), self-time share:

|                                                        | OLD whole (98 ms) | NEW whole (145 ms) | NEW 64 KB (88 ms) |
| ------------------------------------------------------ | ----------------: | -----------------: | ----------------: |
| **(garbage collector)**                                |              4.6% |          **36.2%** |              4.3% |
| `nextMany` `.then(()=>next(…))` closure (`exec.js:56`) |                 — |               8.2% |              2.9% |
| `processTicksAndRejections` (microtask drain)          |              4.9% |               4.5% |              1.4% |
| parser regex/scan, stringer, `isMany`/`isFinalValue`   |          the rest |           the rest |          the rest |

The new build's whole-chunk slowdown is **almost entirely GC** (36% vs 4%), and the
non-GC hot spot that grows is the closure at `exec.js:56`. The old build never gets
near it (GC stays ~4.6% even on one giant chunk).

### The mechanism

stream-json's `jsonParser` is a flushable that returns `many([…all tokens for this
input buffer…])` (`src/core/parser.js:483`). So one input chunk → one `many()` array,
sized in proportion to the chunk. `exec.next` dispatches that to `nextMany`:

```js
// exec.js — the buggy version
const nextMany = (values, fns, i, push) => {
  let pending;
  for (let j = 0; j < values.length; ++j) {
    if (pending) {
      const jj = j;
      pending = pending.then(() => next(values[jj], fns, i, push)); // ← line 56
    } else {
      const r = next(values[j], fns, i, push);
      if (r && typeof r.then == 'function') pending = r; // first backpressure
    }
  }
  return pending;
};
```

`asStream`'s `push` (`enqueue`) returns a Promise the moment `stream.push()` reports
the readable buffer is full — i.e. after ~`highWaterMark` items (16 in object mode).
From that element on, **every remaining element takes the `if (pending)` branch and
eagerly allocates a closure + a `.then` Promise**, all chained and all live at once.
For a `many()` of N tokens that is **O(N − hwm) promises and closures allocated up
front** — the "accumulation proportional to the chunk." V8 then spends ~36% of its
time collecting that garbage.

With 64 KB chunks each `many()` holds only a few hundred tokens, the post-backpressure
tail is short, allocation is bounded, GC stays ~4%, and `exec`'s leaner
sync-when-possible dispatch (no `async` frame, no per-token `await`) wins outright.

### Why OLD `applyFns` is immune

The old path is a single `async function apply` that **`await`s each element inline**
(`asStream.js`, the `isMany` branch: `await apply(values[j], i, push)`). Suspension
state is one reused stack frame — O(1) live objects per element, no growing chain — so
chunk size doesn't change its per-token cost. It pays a fixed `apply` self-cost
(25.6%) instead, which is why it's flat but never as fast as fixed-`exec`.

## The fix (validated)

`nextGen` in the same file already does this correctly — a resumable `step` that
allocates one closure **per actual suspension**, not per element. `nextMany` should
mirror it:

```js
const nextMany = (values, fns, i, push) => {
  const step = j => {
    for (; j < values.length; ++j) {
      const r = next(values[j], fns, i, push);
      if (r && typeof r.then == 'function') {
        const jj = j;
        return r.then(() => step(jj + 1)); // one closure per suspension, not per element
      }
    }
  };
  return step(0);
};
```

Backpressure resumes the loop from the next index instead of pre-building the whole
tail. Measured with this patch in place: the chunk sweep goes **flat at ~83 ms**
(whole-chunk 147 → 84 ms, −43%), and stream-chain's own `exec`/`fun`/`gen` tests stay
green (77 asserts). Same idea applies to `flush()` (`exec.js:91–106`), which carries
the identical eager-chain pattern — lower impact (it only iterates flushable stages,
of which there are few), but worth fixing for consistency.

This belongs in **stream-chain**, not stream-json — stream-json has no code to change.

## Bottom line for the publish decision

- The new `exec()` is the right direction: **~18–23% faster** on realistic chunked
  stream-json workloads (real files, `file-pipelines.js`).
- Ship the `nextMany` (and `flush`) resumable-step fix **first** — without it, any
  consumer that hands stream-chain a single large chunk (e.g. `Readable.from([buf])`,
  an in-memory string, a small file read whole) hits the GC pathology.
- With the fix, the new executor beats the old one at **every** chunk size, so the
  earlier `pipelines.js` verdict ("do not publish") is **withdrawn** — it measured the
  one unrepresentative input shape that also happened to expose a real, fixable bug.

## Files

- `chunk-sweep.js` — the chunk-size sweep (the decisive experiment)
- `file-pipelines.js` / `file-process.mjs` — realistic disk I/O (representative)
- `profile-chunk.mjs` + `prof-summary.mjs` + `prof/*.cpuprofile` — the GC evidence
