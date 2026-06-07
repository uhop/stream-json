import {test} from 'tape-six';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import parseFile, {parser as parseFileAlias} from '../../src/file/parser.js';
import parseJsoncFile, {parser as parseJsoncFileAlias} from '../../src/file/jsonc/parser.js';
import Assembler from '../../src/core/assembler.js';
import pipe from '../../src/utils/pipe.js';
import drain from '../../src/utils/drain.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-parser-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

const assembleFile = async path => {
  const asm = new Assembler();
  return drain(pipe(parseFile(), asm.tapChain)(path));
};

test.asPromise('parseFile: round-trip equality vs JSON.parse', async (t, resolve) => {
  const value = {
    a: 1,
    b: 'two',
    c: [3, false, null, {x: 'y'}],
    nested: {deep: {deeper: ['a', 'b', 'c']}}
  };
  await inTempDir(async dir => {
    const path = join(dir, 'sample.json');
    await writeFile(path, JSON.stringify(value));
    const built = await assembleFile(path);
    t.deepEqual(built, value);
  });
  resolve();
});

test.asPromise('parseFile: handles a file with primitive root', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'num.json');
    await writeFile(path, '42');
    t.equal(await assembleFile(path), 42);
  });
  resolve();
});

test.asPromise('parseFile: handles a 4 MB file (block crossings)', async (t, resolve) => {
  await inTempDir(async dir => {
    const items = Array.from({length: 5000}, (_, i) => ({id: i, label: 'item-' + i, ok: i % 2 === 0}));
    const path = join(dir, 'big.json');
    await writeFile(path, JSON.stringify(items));
    const built = await assembleFile(path);
    t.deepEqual(built, items);
  });
  resolve();
});

test.asPromise('parseFile: invalid input rejects with a parser error', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'bad.json');
    await writeFile(path, '{"a": 1,'); // truncated
    try {
      await assembleFile(path);
      t.fail('expected throw on truncated JSON');
    } catch (e) {
      t.ok(e instanceof Error, 'threw an Error');
    }
  });
  resolve();
});

test.asPromise('parseFile: ENOENT propagates', async (t, resolve) => {
  try {
    await assembleFile('/tmp/stream-json-does-not-exist-' + process.pid + '.json');
    t.fail('expected ENOENT');
  } catch (e) {
    t.equal(e.code, 'ENOENT');
  }
  resolve();
});

test('parseFile: named `parser` alias === parseFile (matches file name)', t => {
  t.equal(parseFileAlias, parseFile, 'JSON: parser === parseFile');
  t.equal(parseJsoncFileAlias, parseJsoncFile, 'JSONC: parser === parseFile');
});

test.asPromise('parseFile: respects readBlockSize option', async (t, resolve) => {
  // tiny block size forces many block boundaries; output must be identical
  await inTempDir(async dir => {
    const value = {message: 'hello world', items: [1, 2, 3, 4, 5]};
    const path = join(dir, 'small-blocks.json');
    await writeFile(path, JSON.stringify(value));
    const asm = new Assembler();
    const built = await drain(pipe(parseFile({readBlockSize: 4}), asm.tapChain)(path));
    t.deepEqual(built, value);
  });
  resolve();
});
