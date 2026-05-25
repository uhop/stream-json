#!/usr/bin/env bash
# Compare the published stream-chain executor (async applyFns) against the
# unpublished unified exec() build at ~/Open/stream-chain.
#
#   baseline (node_modules) -> npm link -> linked -> restore
#
# Restore deliberately uses `git checkout` + `npm install`, NOT `npm unlink`:
# `npm unlink stream-chain` strips the dependency out of package.json.
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root
SC_LOCAL="${SC_LOCAL:-$HOME/Open/stream-chain}"
COUNT="${BENCH_COUNT:-2000}"
SAMPLES="${SAMPLES:-50}"
BENCH=bench/exec-compare/pipelines.js

run() { BENCH_COUNT="$COUNT" npx nano-bench -s "$SAMPLES" "$BENCH"; }

restore() {
  echo "== restoring published stream-chain =="
  git checkout -- package.json package-lock.json 2>/dev/null || true
  npm install >/dev/null 2>&1
  npm unlink -g stream-chain >/dev/null 2>&1 || true
}
trap restore EXIT

echo "== BASELINE (published stream-chain) =="
run | tee bench/exec-compare/baseline.txt

echo "== linking $SC_LOCAL =="
(cd "$SC_LOCAL" && npm link >/dev/null 2>&1)
npm link stream-chain >/dev/null 2>&1

echo "== LINKED (unpublished exec()) =="
run | tee bench/exec-compare/linked.txt

echo "== done — see bench/exec-compare/RESULTS.md =="
