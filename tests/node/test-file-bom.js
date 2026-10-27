import {test} from 'tape-six';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import parseFile from '../../src/file/parser.js';
import parseJsoncFile from '../../src/file/jsonc/parser.js';
import verifyFile from '../../src/file/verifier.js';
import verifyJsoncFile from '../../src/file/jsonc/verifier.js';
import Assembler from '../../src/core/assembler.js';
import pipe from '../../src/utils/pipe.js';
import drain from '../../src/utils/drain.js';

const BOM = '﻿';
const doc = '{"a":1}';

const withFile = async (text, fn) => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-bom-'));
  try {
    const path = join(dir, 'input.json');
    await writeFile(path, text);
    return await fn(path);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

for (const [name, make] of [
  ['parseFile', parseFile],
  ['jsonc parseFile', parseJsoncFile]
]) {
  const assemble = (path, options) => drain(pipe(make(options), new Assembler().tapChain)(path));

  test(`${name}: drops a leading BOM`, async t => {
    await withFile(BOM + doc, async path => t.deepEqual(await assemble(path), {a: 1}));
  });

  test(`${name}: keeps a leading BOM with ignoreBOM`, async t => {
    await withFile(BOM + doc, path => t.rejects(assemble(path, {ignoreBOM: true})));
  });

  test(`${name}: drops one leading U+FEFF, not two`, async t => {
    await withFile(BOM + BOM + doc, path => t.rejects(assemble(path)));
  });
}

for (const [name, verify] of [
  ['verifyFile', verifyFile],
  ['jsonc verifyFile', verifyJsoncFile]
]) {
  test(`${name}: drops a leading BOM`, async t => {
    await withFile(BOM + doc, path => t.resolves(verify(path)));
  });

  test(`${name}: keeps a leading BOM with ignoreBOM`, async t => {
    await withFile(BOM + doc, path => t.rejects(verify(path, {ignoreBOM: true})));
  });

  test(`${name}: drops one leading U+FEFF, not two`, async t => {
    await withFile(BOM + BOM + doc, path => t.rejects(verify(path)));
  });
}
