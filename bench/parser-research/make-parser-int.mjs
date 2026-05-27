// Generate parser-int.js: an int-enum-state variant of src/core/parser.js,
// produced by substituting the quoted state string-literals with integer
// constants. Mechanical & safe: the state words only appear as single-quoted
// literals in state context (case labels, `expect` assigns/compares,
// `expected`-map values). `patterns.value1` etc. are dotted identifiers (not
// quoted) so they are NOT touched; token-name strings ('startObject',
// 'numberValue', …) and parent values ('object', 'array') are not in the map.
//
//   node bench/parser-research/make-parser-int.mjs
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '../../src/core/parser.js');
const OUT = join(here, 'parser-int.js');

const map = {
  "'numberFracStart'": 'NUMBER_FRAC_START',
  "'numberFracDigit'": 'NUMBER_FRAC_DIGIT',
  "'numberExpStart'": 'NUMBER_EXP_START',
  "'numberExpDigit'": 'NUMBER_EXP_DIGIT',
  "'numberExponent'": 'NUMBER_EXPONENT',
  "'numberExpSign'": 'NUMBER_EXP_SIGN',
  "'numberFraction'": 'NUMBER_FRACTION',
  "'numberStart'": 'NUMBER_START',
  "'numberDigit'": 'NUMBER_DIGIT',
  "'objectStop'": 'OBJECT_STOP',
  "'arrayStop'": 'ARRAY_STOP',
  "'keyVal'": 'KEYVAL',
  "'value1'": 'VALUE1',
  "'string'": 'STRING',
  "'colon'": 'COLON',
  "'value'": 'VALUE',
  "'done'": 'DONE',
  "'key1'": 'KEY1',
  "'key'": 'KEY'
};

const consts = `const VALUE1 = 0,
  VALUE = 1,
  KEYVAL = 2,
  STRING = 3,
  KEY1 = 4,
  KEY = 5,
  COLON = 6,
  ARRAY_STOP = 7,
  OBJECT_STOP = 8,
  NUMBER_START = 9,
  NUMBER_DIGIT = 10,
  NUMBER_FRACTION = 11,
  NUMBER_FRAC_START = 12,
  NUMBER_FRAC_DIGIT = 13,
  NUMBER_EXPONENT = 14,
  NUMBER_EXP_SIGN = 15,
  NUMBER_EXP_START = 16,
  NUMBER_EXP_DIGIT = 17,
  DONE = 18;

`;

let src = await readFile(SRC, 'utf8');
src = src.replace(/^\/\/ @ts-self-types.*\n/, '');
for (const [lit, name] of Object.entries(map)) src = src.split(lit).join(name);
src = src.replace('const patterns = {', consts + 'const patterns = {');
await writeFile(OUT, src);

const leftovers = Object.keys(map).filter(lit => src.includes(lit));
console.log('wrote', OUT, '| leftover quoted state literals:', leftovers.length ? leftovers : 'none');
