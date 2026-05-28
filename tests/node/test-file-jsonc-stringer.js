import {test} from 'tape-six';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import parseFile from '../../src/file/jsonc/parser.js';
import stringerToFile from '../../src/file/jsonc/stringer.js';
import Assembler from '../../src/core/assembler.js';
import pipe from '../../src/core/utils/pipe.js';
import drain from '../../src/core/utils/drain.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-jsonc-stringer-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

const assembleJsonc = async path => {
  const asm = new Assembler();
  return drain(pipe(parseFile(), asm.tapChain)(path));
};

test.asPromise('jsonc parseFile → stringerToFile: data round-trip equality', async (t, resolve) => {
  await inTempDir(async dir => {
    const src = join(dir, 'in.jsonc');
    const dst = join(dir, 'out.jsonc');
    // Input has comments and trailing commas; the JSONC parser emits
    // whitespace + comment tokens and the JSONC stringer round-trips them
    // verbatim, so we re-parse the output as JSONC to compare data semantics.
    await writeFile(src, '// header\n{"a": 1, "b": [2, 3,], /* end */}\n');
    await drain(pipe(parseFile(), stringerToFile(dst))(src));

    const built = await assembleJsonc(dst);
    t.deepEqual(built, {a: 1, b: [2, 3]}, 'data semantics preserved');
    const text = await readFile(dst, 'utf8');
    t.ok(text.includes('// header'), 'line comment preserved');
    t.ok(text.includes('/* end */'), 'block comment preserved');
  });
  resolve();
});
