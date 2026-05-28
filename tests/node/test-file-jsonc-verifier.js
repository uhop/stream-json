import {test} from 'tape-six';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import verifyFile from '../../src/file/jsonc/verifier.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-jsonc-verifier-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

test.asPromise('jsonc verifyFile: comments + trailing commas pass', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'ok.jsonc');
    await writeFile(path, '// hi\n{"a": 1, "b": [2, 3,], /* end */}\n');
    await verifyFile(path);
    t.pass('resolved');
  });
  resolve();
});

test.asPromise('jsonc verifyFile: invalid input rejects with location', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'bad.jsonc');
    await writeFile(path, '[1,2 3]');
    try {
      await verifyFile(path);
      t.fail('expected throw');
    } catch (e) {
      t.equal(typeof e.line, 'number');
      t.equal(typeof e.pos, 'number');
      t.equal(typeof e.offset, 'number');
    }
  });
  resolve();
});
