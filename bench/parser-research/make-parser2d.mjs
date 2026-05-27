// Generate parser2d.js = parser2c.js with the numberFull REGEX replaced by a
// charCodeAt number scan (JSON number grammar: -?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?).
// Fires only with a clear in-buffer terminator after the number; bails to the
// incremental machine on incomplete-in-buffer (wait) or malformed (canonical
// error). Finishes evicting the regex engine from the hot path.
//   node bench/parser-research/make-parser2d.mjs
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let src = await readFile(join(here, 'parser2c.js'), 'utf8');
const must = (needle, label) => {
  if (src.split(needle).length - 1 !== 1) throw new Error(`anchor "${label}" not unique`);
};

must('// parser2c: parser2b with the charCodeAt string scan extended to decode escapes inline.', 'header');
src = src.replace(
  '// parser2c: parser2b with the charCodeAt string scan extended to decode escapes inline.',
  '// parser2d: parser2c with the numberFull regex replaced by a charCodeAt number scan.'
);

const varsFrom = `      q,
      rs,
      cc,
      value,
      index = 0;`;
must(varsFrom, 'vars');
src = src.replace(varsFrom, `      q,
      rs,
      ok,
      cc,
      value,
      index = 0;`);

const numFrom = `            // number: try whole-number fast path (only with a clear terminator in buffer)
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
            }`;
const numTo = `            // number: charCodeAt whole-number scan (only with a clear terminator in buffer)
            q = index;
            ok = true;
            if (cc === 45) ++q; // optional minus
            if (q >= buffer.length) {
              ok = false;
            } else {
              e = buffer.charCodeAt(q);
              if (e === 48) {
                ++q; // 0 -> no further integer digits
              } else if (e >= 49 && e <= 57) {
                ++q;
                while (q < buffer.length && (e = buffer.charCodeAt(q)) >= 48 && e <= 57) ++q;
              } else {
                ok = false;
              }
            }
            if (ok && q < buffer.length && buffer.charCodeAt(q) === 46) {
              ++q; // fraction
              if (q >= buffer.length || (e = buffer.charCodeAt(q)) < 48 || e > 57) {
                ok = false;
              } else {
                ++q;
                while (q < buffer.length && (e = buffer.charCodeAt(q)) >= 48 && e <= 57) ++q;
              }
            }
            if (ok && q < buffer.length && ((e = buffer.charCodeAt(q)) === 101 || e === 69)) {
              ++q; // exponent
              if (q < buffer.length && ((e = buffer.charCodeAt(q)) === 43 || e === 45)) ++q;
              if (q >= buffer.length || (e = buffer.charCodeAt(q)) < 48 || e > 57) {
                ok = false;
              } else {
                ++q;
                while (q < buffer.length && (e = buffer.charCodeAt(q)) >= 48 && e <= 57) ++q;
              }
            }
            if (ok && q < buffer.length && TERM[buffer.charCodeAt(q)]) {
              s = buffer.slice(index, q);
              if (streamNumbers) tokens.push(tokenStartNumber, {name: 'numberChunk', value: s}, tokenEndNumber);
              if (packNumbers) tokens.push({name: 'numberValue', value: s});
              index = q;
              expect = expected[parent];
              continue main;
            }`;
must(numFrom, 'number fast path');
src = src.replace(numFrom, numTo);

await writeFile(join(here, 'parser2d.js'), src);
console.log('wrote parser2d.js');
