import {test} from 'tape-six';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import verifyFile from '../../src/file/verifier.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-verifier-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

test.asPromise('verifyFile: valid object resolves', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'ok.json');
    await writeFile(path, '{"a": 1, "b": [2,3,4]}');
    await verifyFile(path); // resolves; no assertion needed
    t.pass('resolved');
  });
  resolve();
});

test.asPromise('verifyFile: valid jsonStreaming sequence resolves', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'stream.json');
    await writeFile(path, '1 2 3 {"a":1}');
    await verifyFile(path, {jsonStreaming: true});
    t.pass('resolved');
  });
  resolve();
});

test.asPromise('verifyFile: missing comma rejects with line/pos/offset', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'bad.json');
    await writeFile(path, '[1,2 3]');
    try {
      await verifyFile(path);
      t.fail('expected throw');
    } catch (e) {
      t.equal(e.line, 1);
      t.equal(e.pos, 6);
      t.equal(e.offset, 5);
    }
  });
  resolve();
});

test.asPromise('verifyFile: truncated input rejects', async (t, resolve) => {
  await inTempDir(async dir => {
    const path = join(dir, 'trunc.json');
    await writeFile(path, '{"a":');
    try {
      await verifyFile(path);
      t.fail('expected throw');
    } catch (e) {
      t.ok(e instanceof Error);
    }
  });
  resolve();
});

test.asPromise('verifyFile: ENOENT propagates', async (t, resolve) => {
  try {
    await verifyFile('/tmp/sj-verify-missing-' + process.pid + '.json');
    t.fail('expected ENOENT');
  } catch (e) {
    t.equal(e.code, 'ENOENT');
  }
  resolve();
});
