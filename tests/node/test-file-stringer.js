import {test} from 'tape-six';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import parseFile from '../../src/file/parser.js';
import stringerToFile, {stringer as stringerToFileAlias} from '../../src/file/stringer.js';
import jsoncStringerToFile, {stringer as jsoncStringerToFileAlias} from '../../src/file/jsonc/stringer.js';
import pipe from '../../src/core/utils/pipe.js';
import drain from '../../src/core/utils/drain.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-stringer-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

test.asPromise('stringerToFile: simple round-trip parseFile → stringerToFile', async (t, resolve) => {
  await inTempDir(async dir => {
    const value = {a: 1, b: 'two', c: [3, false, null, {x: 'y'}]};
    const src = join(dir, 'in.json');
    const dst = join(dir, 'out.json');
    await writeFile(src, JSON.stringify(value));

    await drain(pipe(parseFile(), stringerToFile(dst))(src));

    const written = await readFile(dst, 'utf8');
    t.deepEqual(JSON.parse(written), value, 'round-trip JSON.parse equal');
  });
  resolve();
});

test.asPromise('stringerToFile: writer creates the file and closes it on flush', async (t, resolve) => {
  await inTempDir(async dir => {
    const value = [1, 2, 3];
    const src = join(dir, 'arr.json');
    const dst = join(dir, 'arr-out.json');
    await writeFile(src, JSON.stringify(value));

    await drain(pipe(parseFile(), stringerToFile(dst))(src));

    const stat = (await import('node:fs/promises')).stat;
    const s = await stat(dst);
    t.ok(s.isFile(), 'output file exists');
    t.equal(JSON.parse(await readFile(dst, 'utf8')).length, 3);
  });
  resolve();
});

test.asPromise('stringerToFile: respects writeBlockSize option (large input)', async (t, resolve) => {
  await inTempDir(async dir => {
    const items = Array.from({length: 5000}, (_, i) => ({id: i, label: 'item-' + i}));
    const src = join(dir, 'big.json');
    const dst = join(dir, 'big-out.json');
    await writeFile(src, JSON.stringify(items));

    // tiny write blocks force many fd.write() calls; output must still equal
    await drain(pipe(parseFile(), stringerToFile(dst, {writeBlockSize: 256}))(src));

    t.deepEqual(JSON.parse(await readFile(dst, 'utf8')), items);
  });
  resolve();
});

test('stringerToFile: named `stringer` alias === stringerToFile (matches file name)', t => {
  t.equal(stringerToFileAlias, stringerToFile, 'JSON: stringer === stringerToFile');
  t.equal(jsoncStringerToFileAlias, jsoncStringerToFile, 'JSONC: stringer === stringerToFile');
});

test.asPromise('stringerToFile: failed open propagates (bad path)', async (t, resolve) => {
  await inTempDir(async dir => {
    const src = join(dir, 'in.json');
    await writeFile(src, '{"a":1}');
    const dst = join(dir, 'no-such-dir', 'out.json');
    try {
      await drain(pipe(parseFile(), stringerToFile(dst))(src));
      t.fail('expected ENOENT');
    } catch (e) {
      t.equal(e.code, 'ENOENT');
    }
  });
  resolve();
});
