// Generate parser2b.js = parser2.js with the shortString fast-path REGEX
// replaced by a charCodeAt scan (find closing quote; bail to the incremental
// machine on backslash / control char / >256). Isolates regex-vs-charCodeAt for
// the string body. node bench/parser-research/make-parser2b.mjs
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let src = await readFile(join(here, 'parser2.js'), 'utf8');

const assertOne = (needle, label) => {
  if (src.split(needle).length - 1 !== 1) throw new Error(`anchor "${label}" not unique`);
};

src = src.replace(
  '// parser2: charCodeAt-based JSON parser (experimental).',
  '// parser2b: parser2 with a charCodeAt string-body scan instead of the shortString regex.'
);

// extra scratch var q
const varsFrom = `    let match,
      fm,
      s,
      e,
      cc,
      value,
      index = 0;`;
const varsTo = `    let match,
      fm,
      s,
      e,
      q,
      cc,
      value,
      index = 0;`;
assertOne(varsFrom, 'vars');
src = src.replace(varsFrom, varsTo);

const scan = `            q = index + 1;
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

// value-position string fast path
const valFrom = `            // string: try whole-string fast path
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
            }`;
const valTo = `            // string: charCodeAt whole-string scan (short, no escapes)
${scan}
              if (streamStrings) {
                tokens.push(tokenStartString);
                if (s) tokens.push({name: 'stringChunk', value: s});
                tokens.push(tokenEndString);
              }
              if (packStrings) tokens.push({name: 'stringValue', value: s});
              index = q + 1;
              expect = expected[parent];
              continue main;
            }`;
assertOne(valFrom, 'value string fast path');
src = src.replace(valFrom, valTo);

// key-position string fast path
const keyFrom = `            // key string: whole-key fast path
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
            }`;
const keyTo = `            // key string: charCodeAt whole-key scan
${scan}
              if (streamKeys) {
                tokens.push(tokenStartKey);
                if (s) tokens.push({name: 'stringChunk', value: s});
                tokens.push(tokenEndKey);
              }
              if (packKeys) tokens.push({name: 'keyValue', value: s});
              index = q + 1;
              expect = 'colon';
              continue main;
            }`;
assertOne(keyFrom, 'key string fast path');
src = src.replace(keyFrom, keyTo);

await writeFile(join(here, 'parser2b.js'), src);
console.log('wrote parser2b.js | shortString regex references left:', src.split('shortString').length - 1);
