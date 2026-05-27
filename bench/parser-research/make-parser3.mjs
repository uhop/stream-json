// Generate parser3.js = src/core/parser.js + whole-string/whole-number/whole-key
// fast paths, surgically inserted. The unchanged parser body is copied verbatim
// (proven resumable machine); the fast paths only fire when a lexeme is fully in
// the buffer with a clear terminator, otherwise control falls through to the
// existing incremental states. Token output is semantically identical (verified
// by parser-compare.js).
//
//   node bench/parser-research/make-parser3.mjs
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '../../src/core/parser.js');
const OUT = join(here, 'parser3.js');

let src = await readFile(SRC, 'utf8');
src = src.replace(/^\/\/ @ts-self-types.*\n/, '');

const assertOne = (hay, needle, label) => {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error(`anchor "${label}" matched ${n} times (expected 1)`);
};

// 1) fast-path constants + regexes, injected before `const jsonParser`
const consts = `// --- parser3 fast-path additions ---
const TERM = [];
TERM[44] = TERM[125] = TERM[93] = TERM[32] = TERM[9] = TERM[10] = TERM[13] = 1; // , } ] sp tab lf cr
const shortString = /[^\\x00-\\x1f"\\\\]{0,256}"/y;
const numberFull = /-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][-+]?\\d+)?/y;

`;
assertOne(src, 'const jsonParser = options => {', 'jsonParser decl');
src = src.replace('const jsonParser = options => {', consts + 'const jsonParser = options => {');

// 2) extra scratch vars
const varsFrom = `    let match,
      value,
      index = 0;`;
const varsTo = `    let match,
      fm,
      s,
      e,
      value,
      index = 0;`;
assertOne(src, varsFrom, 'var decl');
src = src.replace(varsFrom, varsTo);

// 3) value-position fast path (string + number), before the inner switch(value)
const valFrom = `          value = match[0];
          switch (value) {`;
const valTo = `          value = match[0];
          if (value.charCodeAt(0) === 34) {
            shortString.lastIndex = index + 1;
            fm = shortString.exec(buffer);
            if (fm) {
              s = fm[0].slice(0, -1);
              if (streamStrings) {
                tokens.push(tokenStartString);
                if (s) tokens.push({name: 'stringChunk', value: s});
                tokens.push(tokenEndString);
              }
              if (packStrings) tokens.push({name: 'stringValue', value: s});
              index += 1 + fm[0].length;
              expect = expected[parent];
              continue main;
            }
          } else {
            e = value.charCodeAt(0);
            if (e === 45 || (e >= 48 && e <= 57)) {
              numberFull.lastIndex = index;
              fm = numberFull.exec(buffer);
              if (fm) {
                e = index + fm[0].length;
                if (e < buffer.length && TERM[buffer.charCodeAt(e)]) {
                  s = fm[0];
                  if (streamNumbers) tokens.push(tokenStartNumber, {name: 'numberChunk', value: s}, tokenEndNumber);
                  if (packNumbers) tokens.push({name: 'numberValue', value: s});
                  index = e;
                  expect = expected[parent];
                  continue main;
                }
              }
            }
          }
          switch (value) {`;
assertOne(src, valFrom, 'value switch');
src = src.replace(valFrom, valTo);

// 4) key-position fast path, in the key1 case
const keyFrom = `          if (value === '"') {
            if (streamKeys) tokens.push(tokenStartKey);
            expect = 'keyVal';`;
const keyTo = `          if (value === '"') {
            shortString.lastIndex = index + 1;
            fm = shortString.exec(buffer);
            if (fm) {
              s = fm[0].slice(0, -1);
              if (streamKeys) {
                tokens.push(tokenStartKey);
                if (s) tokens.push({name: 'stringChunk', value: s});
                tokens.push(tokenEndKey);
              }
              if (packKeys) tokens.push({name: 'keyValue', value: s});
              index += 1 + fm[0].length;
              expect = 'colon';
              continue main;
            }
            if (streamKeys) tokens.push(tokenStartKey);
            expect = 'keyVal';`;
assertOne(src, keyFrom, 'key1 string branch');
src = src.replace(keyFrom, keyTo);

await writeFile(OUT, src);
console.log('wrote', OUT);
