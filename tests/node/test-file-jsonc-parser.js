import {test} from 'tape-six';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import parseFile from '../../src/file/jsonc/parser.js';
import Assembler from '../../src/core/assembler.js';
import pipe from '../../src/core/utils/pipe.js';
import drain from '../../src/core/utils/drain.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-jsonc-parser-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

test.asPromise('jsonc parseFile: handles line and block comments', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'commented.jsonc');
    await writeFile(path, '// leading comment\n{\n  "a": 1, // inline\n  /* block */ "b": [2, 3]\n}');
    const asm = new Assembler();
    const built = await drain(pipe(parseFile(), asm.tapChain)(path));
    t.deepEqual(built, {a: 1, b: [2, 3]});
  });
  resolve();
});

test.asPromise('jsonc parseFile: accepts trailing commas', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'trailing.jsonc');
    await writeFile(path, '{\n  "a": 1,\n  "b": [2, 3,],\n}');
    const asm = new Assembler();
    const built = await drain(pipe(parseFile(), asm.tapChain)(path));
    t.deepEqual(built, {a: 1, b: [2, 3]});
  });
  resolve();
});

test.asPromise('jsonc parseFile: invalid input rejects', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'bad.jsonc');
    await writeFile(path, '{"a": /* unterminated block ');
    try {
      const asm = new Assembler();
      await drain(pipe(parseFile(), asm.tapChain)(path));
      t.fail('expected throw');
    } catch (e) {
      t.ok(e instanceof Error);
    }
  });
  resolve();
});
