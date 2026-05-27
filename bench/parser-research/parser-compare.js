// Three-way correctness + perf comparison of the JSON parsers:
//   parser.js  (current: regex classify + regex string/number)
//   parser3.js (current + whole-lexeme fast paths)
//   parser2.js (charCodeAt classify + fast paths + regex fallback)
//
//   npx nano-bench bench/parser-research/parser-compare.js
//
// Correctness runs at load: every variant must produce the SAME normalized
// token stream as the current parser across many docs x chunkings x option
// modes (normalized = consecutive stringChunk/numberChunk merged, since chunk
// granularity is input-chunking-dependent even for the current parser). Throws
// on any divergence before benchmarking.

import {jsonParser as cur} from '../../src/core/parser.js';
import {jsonParser as p2} from './parser2.js';
import {jsonParser as p2b} from './parser2b.js';
import {jsonParser as p2c} from './parser2c.js';
import {jsonParser as p2d} from './parser2d.js';
import {jsonParser as p3} from './parser3.js';
import {none} from 'stream-chain/core';

const collect = (jp, opts, chunks) => {
  const f = jp(opts);
  const out = [];
  for (const c of chunks) {
    const r = f(c);
    if (r !== none) for (const t of r.values) out.push(t);
  }
  const r = f(none);
  if (r !== none) for (const t of r.values) out.push(t);
  return out;
};

// merge consecutive same-type chunk tokens; drop empty merges
const normalize = toks => {
  const out = [];
  for (const t of toks) {
    const last = out[out.length - 1];
    if ((t.name === 'stringChunk' || t.name === 'numberChunk') && last && last.name === t.name) {
      last.value += t.value;
    } else {
      out.push({name: t.name, value: t.value});
    }
  }
  return out;
};

const run1 = (jp, opts, chunks) => {
  try {
    return {ok: true, toks: JSON.stringify(normalize(collect(jp, opts, chunks)))};
  } catch (err) {
    return {ok: false, err: err.message};
  }
};

const splitters = [
  ['one', s => [s]],
  ['1ch', s => [...s]],
  ['3ch', s => s.match(/[\s\S]{1,3}/g) || ['']],
  ['7ch', s => s.match(/[\s\S]{1,7}/g) || ['']],
  ['64ch', s => s.match(/[\s\S]{1,64}/g) || ['']]
];

const longStr = 'a'.repeat(300); // > 256 -> forces string fallback
const escStr = 'a\\tb\\nc\\"d\\\\e\\u00e9f'; // escapes -> fallback (already JSON-escaped form)
const docs = [
  '{}',
  '[]',
  '0',
  '-0',
  '123',
  '-123',
  '3.14',
  '-3.14',
  '0.5',
  '6.022e23',
  '1.5e-10',
  '2E+5',
  '9007199254740991',
  '"hello"',
  '""',
  '"with space and, punctuation: }] chars"',
  'true',
  'false',
  'null',
  '[1,2,3]',
  '[true,false,null]',
  '{"a":1}',
  '{"a":1,"b":2,"c":3}',
  '{"a":-1.5e3,"b":"x","c":[1,{"d":null}]}',
  '   {  "a" :  1 , "b": [ 2 , 3 ]  }  ',
  '[[[[]]]]',
  '{"k":""}',
  `{"long":"${longStr}"}`,
  `["${escStr}"]`,
  '"\\u0041\\u00e9\\ud83d\\ude00"',
  '"tab\\tnl\\nquote\\"end"',
  '"\\\\\\/\\b\\f\\r"',
  '{"k\\ney":"v\\tal"}',
  '["\\uABCDx","plain","\\t"]',
  '{"nested":{"deep":{"deeper":[1,2,{"x":"y"}]}}}',
  '[0.1,0.2,0.3,1e1,1e-1,-0.0]'
];

const MODES = [
  ['default', undefined],
  ['pack-only', {packValues: true, streamValues: false}],
  ['stream-only', {packValues: false, streamValues: true}],
  ['keys-stream-vals-pack', {streamKeys: true, packKeys: false, streamStrings: false, packStrings: true}]
];

const variants = [
  ['parser2', p2],
  ['parser2b', p2b],
  ['parser2c', p2c],
  ['parser2d', p2d],
  ['parser3', p3]
];

let checks = 0,
  fails = 0;
for (const doc of docs) {
  for (const [mlabel, opts] of MODES) {
    for (const [slabel, split] of splitters) {
      const chunks = split(doc);
      const base = run1(cur, opts, chunks);
      for (const [vlabel, jp] of variants) {
        const got = run1(jp, opts, chunks);
        ++checks;
        const same = base.ok === got.ok && (base.ok ? base.toks === got.toks : true);
        if (!same) {
          ++fails;
          if (fails <= 8) {
            console.error(`\nMISMATCH ${vlabel} | mode=${mlabel} | chunk=${slabel} | doc=${JSON.stringify(doc).slice(0, 60)}`);
            console.error(`  cur: ${base.ok ? base.toks.slice(0, 220) : 'ERROR: ' + base.err}`);
            console.error(`  ${vlabel}: ${got.ok ? got.toks.slice(0, 220) : 'ERROR: ' + got.err}`);
          }
        }
      }
    }
  }
}

// jsonStreaming docs (multiple top-level values)
const streamDocs = ['1 2 3', '{"a":1}\n{"b":2}', 'true false null', '[1] [2] [3]', '123 "x" {"y":4}'];
for (const doc of streamDocs) {
  for (const [slabel, split] of splitters) {
    const chunks = split(doc);
    const base = run1(cur, {jsonStreaming: true}, chunks);
    for (const [vlabel, jp] of variants) {
      const got = run1(jp, {jsonStreaming: true}, chunks);
      ++checks;
      const same = base.ok === got.ok && (base.ok ? base.toks === got.toks : true);
      if (!same) {
        ++fails;
        if (fails <= 8) {
          console.error(`\nMISMATCH(stream) ${vlabel} | chunk=${slabel} | doc=${JSON.stringify(doc)}`);
          console.error(`  cur: ${base.ok ? base.toks.slice(0, 220) : 'ERROR: ' + base.err}`);
          console.error(`  ${vlabel}: ${got.ok ? got.toks.slice(0, 220) : 'ERROR: ' + got.err}`);
        }
      }
    }
  }
}

// malformed / incomplete inputs — every variant must reject (or accept) exactly
// as the current parser does (ok-parity; not necessarily identical messages).
const malformed = [
  '01', '00', '1.', '1.e5', '-', '1e', '1e+', '[1 2]', '{"a" 1}', '{"a":1,}', '[1,]',
  'truX', 'nul', 'fals', '"unterminated', '{"a":}', '[,]', '.5', '+5', '1..2', '{a:1}',
  '[1,,2]', 'tru e', '{"a":1"b":2}', '}', ']', ':', ',', '[1', '{"a"', '{"a":', '"a\x01b"'
];
for (const doc of malformed) {
  for (const [slabel, split] of splitters) {
    const chunks = split(doc);
    const base = run1(cur, undefined, chunks);
    for (const [vlabel, jp] of variants) {
      const got = run1(jp, undefined, chunks);
      ++checks;
      // for malformed: require same accept/reject decision, and if both accept, same tokens
      const same = base.ok === got.ok && (base.ok ? base.toks === got.toks : true);
      if (!same) {
        ++fails;
        if (fails <= 12) {
          console.error(`\nMISMATCH(malformed) ${vlabel} | chunk=${slabel} | doc=${JSON.stringify(doc)}`);
          console.error(`  cur: ${base.ok ? 'OK ' + base.toks.slice(0, 160) : 'reject: ' + base.err}`);
          console.error(`  ${vlabel}: ${got.ok ? 'OK ' + got.toks.slice(0, 160) : 'reject: ' + got.err}`);
        }
      }
    }
  }
}

// ---- adversarial number-boundary test ----
// A buffer ending in a well-formed-looking number must NOT be finalized: the
// next chunk can change it ("123" + "e-2" => 123e-2, not 123). Split each number
// at EVERY internal position and assert the assembled numberValue equals the
// original raw text for all three parsers (pack-only -> single numberValue).
const numVal = (jp, chunks) => {
  const toks = collect(jp, {packValues: true, streamValues: false}, chunks);
  const nv = toks.find(t => t.name === 'numberValue');
  return nv ? nv.value : '<none>';
};
const numbers = [
  '0', '-0', '123', '-123', '0.5', '123.456', '6.022e23', '1.5e-10', '2E+5',
  '-0.0', '1e10', '100', '12345', '9e9', '1E-5', '-7.25e+3', '123e-2', '1234567890', '0.000123'
];
for (const num of numbers) {
  // every 2-way split, plus every 3-way split
  const splits = [[num]];
  for (let p = 1; p < num.length; ++p) splits.push([num.slice(0, p), num.slice(p)]);
  for (let p = 1; p < num.length - 1; ++p)
    for (let q = p + 1; q < num.length; ++q) splits.push([num.slice(0, p), num.slice(p, q), num.slice(q)]);
  for (const chunks of splits) {
    const want = num; // numberValue accumulates the raw text
    const a = numVal(cur, chunks),
      b = numVal(p2, chunks),
      b2 = numVal(p2b, chunks),
      c = numVal(p3, chunks);
    ++checks;
    if (!(a === want && b === want && b2 === want && c === want)) {
      ++fails;
      if (fails <= 12)
        console.error(`\nMISMATCH(number-boundary) num=${num} split=${JSON.stringify(chunks)} => cur=${a} p2=${b} p2b=${b2} p3=${c} (want ${want})`);
    }
  }
}

console.log(`[parser-compare] ${checks} equivalence checks, ${fails} mismatch(es)`);
if (fails) throw new Error(`${fails} correctness mismatches — see above`);

// ---------------- benchmark: 1 MB mixed dataset, default mode ----------------
const items = [];
for (let i = 0; i < 5000; ++i) {
  items.push({
    id: i,
    name: `item-${i}-${'x'.repeat(20)}`,
    active: i % 2 === 0,
    score: i * 1.5,
    ratio: i / 7,
    tags: ['alpha', 'beta', 'gamma'],
    nested: {x: i, y: i * 2, label: `nested-${i}`, deep: {a: i, b: i % 3 === 0}}
  });
}
const jsonData = JSON.stringify(items);
console.log(`benchmarking ${(Buffer.byteLength(jsonData) / 1e6).toFixed(3)} MB, default mode`);

let sink = 0;
const drive = (jp, data) => {
  const f = jp();
  let r = f(data);
  if (r !== none) {
    const v = r.values;
    for (let i = 0; i < v.length; ++i) sink += v[i].name.length;
  }
  r = f(none);
  if (r !== none) {
    const v = r.values;
    for (let i = 0; i < v.length; ++i) sink += v[i].name.length;
  }
};

export default {
  'parser (current)'(n) {
    for (let i = 0; i < n; ++i) drive(cur, jsonData);
  },
  'parser3 (regex+fast)'(n) {
    for (let i = 0; i < n; ++i) drive(p3, jsonData);
  },
  'parser2 (charCodeAt+re str)'(n) {
    for (let i = 0; i < n; ++i) drive(p2, jsonData);
  },
  'parser2b (charCodeAt str)'(n) {
    for (let i = 0; i < n; ++i) drive(p2b, jsonData);
  },
  'parser2c (charCodeAt+escape)'(n) {
    for (let i = 0; i < n; ++i) drive(p2c, jsonData);
  },
  'parser2d (charCodeAt+num)'(n) {
    for (let i = 0; i < n; ++i) drive(p2d, jsonData);
  }
};

// number-heavy dataset (arrays of numbers — the inverted composition): exercises
// the number fast path. parser2c uses the numberFull regex; parser2d scans.
const numItems = [];
for (let i = 0; i < 4000; ++i) {
  numItems.push([i, -i, i * 1.5, i / 7, i * 1e-3, -i * 2.25, i + 0.125, 1e6 - i, i % 97, -0.5 * i]);
}
const numData = JSON.stringify(numItems);

export const numHeavy = {
  'current'(n) {
    for (let i = 0; i < n; ++i) drive(cur, numData);
  },
  'parser2c (regex num)'(n) {
    for (let i = 0; i < n; ++i) drive(p2c, numData);
  },
  'parser2d (charCodeAt num)'(n) {
    for (let i = 0; i < n; ++i) drive(p2d, numData);
  }
};

// escape-heavy dataset (logs/paths/JSON-in-JSON): exercises the escape fast path.
// parser2b bails these to the incremental regex machine; parser2c decodes inline.
const escItems = [];
for (let i = 0; i < 5000; ++i) {
  escItems.push({
    msg: `line ${i}:\ttab and\nnewline with "quotes" and \\backslash\\ end`,
    path: `C:\\Users\\u${i}\\data\\file-${i}.txt`,
    note: `unicode éü— and json {"a":1}`,
    id: i
  });
}
const escData = JSON.stringify(escItems);

export const escaped = {
  'current'(n) {
    for (let i = 0; i < n; ++i) drive(cur, escData);
  },
  'parser2b (re fallback)'(n) {
    for (let i = 0; i < n; ++i) drive(p2b, escData);
  },
  'parser2c (charCodeAt esc)'(n) {
    for (let i = 0; i < n; ++i) drive(p2c, escData);
  }
};

export {sink};
