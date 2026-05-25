#!/usr/bin/env bash
# Compare the published stream-chain executor (async applyFns) against the
# unpublished unified exec() build at ~/Open/stream-chain.
#
#   baseline (node_modules) -> npm link -> linked -> restore
#
# Restore is just `npm i`: it reinstalls the registry version over the symlink.
# Do NOT use `npm unlink stream-chain` — that strips the dependency out of
# package.json. `npm link` never touches package.json, so `npm i` is enough.
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root
HERE=bench/exec-compare
SC_LOCAL="${SC_LOCAL:-$HOME/Open/stream-chain}"
COUNT="${BENCH_COUNT:-2000}"
SAMPLES="${SAMPLES:-50}"

# bench modules to run each pass: <module>:<output-tag>
BENCHES=(
  "$HERE/pipelines.js:synthetic"        # in-memory, ONE chunk (unrepresentative — see ANALYSIS.md)
  "$HERE/file-pipelines.js:file"        # real files off disk (representative)
  "$HERE/chunk-sweep.js:chunk"          # same doc, swept chunk sizes (the decisive experiment)
)

# Decompress the real sample files used by file-pipelines.js / file-process.mjs.
mkdir -p "$HERE/data"
[ -f "$HERE/data/sample.json" ]  || gzip -dc tests/data/sample.json.gz  > "$HERE/data/sample.json"
[ -f "$HERE/data/sample.jsonl" ] || gzip -dc tests/data/sample.jsonl.gz > "$HERE/data/sample.jsonl"

pass() { # $1 = label (baseline|linked)
  for entry in "${BENCHES[@]}"; do
    local mod="${entry%%:*}" tag="${entry##*:}"
    echo "-- $1 / $tag ($mod) --"
    BENCH_COUNT="$COUNT" npx nano-bench -s "$SAMPLES" "$mod" | tee "$HERE/$tag-$1.txt"
  done
}

restore() {
  echo "== restoring published stream-chain (npm i over the symlink) =="
  npm i >/dev/null 2>&1
}
trap restore EXIT

echo "== BASELINE (published stream-chain) =="
pass baseline

echo "== linking $SC_LOCAL =="
(cd "$SC_LOCAL" && npm link >/dev/null 2>&1)
npm link stream-chain >/dev/null 2>&1

echo "== LINKED (unpublished exec()) =="
pass linked

echo "== done — see $HERE/RESULTS.md and $HERE/ANALYSIS.md =="
