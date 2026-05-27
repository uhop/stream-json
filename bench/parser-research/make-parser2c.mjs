// Generate parser2c.js = parser2b.js with the charCodeAt string scan extended to
// DECODE ESCAPES inline (\b \f \n \r \t \" \\ \/ and \uXXXX), building the result
// from run-slices. Bails to the incremental machine only when the string is
// incomplete in-buffer (wait) or an escape is invalid (let incremental produce
// the canonical error). No 256 cap: any fully-in-buffer string fast-paths.
//   node bench/parser-research/make-parser2c.mjs
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let src = await readFile(join(here, 'parser2b.js'), 'utf8');
const must = (needle, label, count = 1) => {
  if (src.split(needle).length - 1 !== count) throw new Error(`anchor "${label}" expected ${count}`);
};

// header
must('// parser2b: parser2 with a charCodeAt string-body scan instead of the shortString regex.', 'header');
src = src.replace(
  '// parser2b: parser2 with a charCodeAt string-body scan instead of the shortString regex.',
  '// parser2c: parser2b with the charCodeAt string scan extended to decode escapes inline.'
);

// var rs
const varsFrom = `      q,
      cc,
      value,
      index = 0;`;
must(varsFrom, 'vars');
src = src.replace(varsFrom, `      q,
      rs,
      cc,
      value,
      index = 0;`);

// HEX helper
must('const numberFull = /-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][-+]?\\d+)?/y;', 'numberFull');
src = src.replace(
  'const numberFull = /-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][-+]?\\d+)?/y;',
  'const numberFull = /-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][-+]?\\d+)?/y;\nconst HEX = c => (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);'
);

// the simple scan block appears twice (value + key), byte-identical
const scanOld = `            q = index + 1;
            for (;;) {
              if (q >= buffer.length) {
                q = -1;
                break;
              }
              e = buffer.charCodeAt(q);
              if (e === 34) break;
              if (e === 92 || e < 32 || q - index > 256) {
                q = -1;
                break;
              }
              ++q;
            }
            if (q >= 0) {
              s = buffer.slice(index + 1, q);`;
const scanNew = `            q = index + 1;
            rs = q;
            s = '';
            for (;;) {
              if (q >= buffer.length) {
                q = -1;
                break;
              }
              e = buffer.charCodeAt(q);
              if (e === 34) {
                s += buffer.slice(rs, q);
                break;
              }
              if (e < 32) {
                q = -1;
                break;
              }
              if (e === 92) {
                if (q + 1 >= buffer.length) {
                  q = -1;
                  break;
                }
                cc = buffer.charCodeAt(q + 1);
                if (cc === 117) {
                  if (q + 6 > buffer.length || !(HEX(buffer.charCodeAt(q + 2)) && HEX(buffer.charCodeAt(q + 3)) && HEX(buffer.charCodeAt(q + 4)) && HEX(buffer.charCodeAt(q + 5)))) {
                    q = -1;
                    break;
                  }
                  s += buffer.slice(rs, q) + String.fromCharCode(parseInt(buffer.slice(q + 2, q + 6), 16));
                  q += 6;
                } else {
                  value = codes[buffer.charAt(q + 1)];
                  if (value === undefined) {
                    q = -1;
                    break;
                  }
                  s += buffer.slice(rs, q) + value;
                  q += 2;
                }
                rs = q;
                continue;
              }
              ++q;
            }
            if (q >= 0) {`;
must(scanOld, 'scan block', 2);
src = src.split(scanOld).join(scanNew);

// comment touch-ups
src = src.split('// string: charCodeAt whole-string scan (short, no escapes)').join('// string: charCodeAt whole-string scan (decodes escapes)');
src = src.split('// key string: charCodeAt whole-key scan').join('// key string: charCodeAt whole-key scan (decodes escapes)');

await writeFile(join(here, 'parser2c.js'), src);
console.log('wrote parser2c.js');
