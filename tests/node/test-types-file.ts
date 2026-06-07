import test from 'tape-six';

import parseFile, {parseFile as namedParseFile} from '../../src/file/parser.js';
import type {ParseFileOptions} from '../../src/file/parser.js';
import verifyFile from '../../src/file/verifier.js';
import type {VerifyFileOptions} from '../../src/file/verifier.js';
import stringerToFile from '../../src/file/stringer.js';
import type {StringerToFileOptions} from '../../src/file/stringer.js';
import drain from '../../src/utils/drain.js';
import pipe from '../../src/utils/pipe.js';

import jsoncParseFile from '../../src/file/jsonc/parser.js';
import jsoncVerifyFile from '../../src/file/jsonc/verifier.js';
import jsoncStringerToFile from '../../src/file/jsonc/stringer.js';

test('types: parseFile factory signature', t => {
  const opts: ParseFileOptions = {readBlockSize: 4096, packValues: true};
  const stage = parseFile(opts);
  t.equal(typeof stage, 'function', 'parseFile() returns a function');
  t.equal(parseFile, namedParseFile, 'default === named export');
});

test('types: verifyFile signature', t => {
  const opts: VerifyFileOptions = {readBlockSize: 4096, jsonStreaming: false};
  const p: Promise<void> = verifyFile('/dev/null', opts);
  t.ok(p instanceof Promise);
});

test('types: stringerToFile signature', t => {
  const opts: StringerToFileOptions = {writeBlockSize: 1024, useValues: true};
  const stage = stringerToFile('/dev/null', opts);
  t.equal(typeof stage, 'function');
});

test('types: drain returns Promise<T | undefined>', async t => {
  async function* gen() {
    yield 1;
    yield 2;
  }
  const last: number | undefined = await drain(gen());
  t.equal(last, 2);
});

test('types: pipe returns a single-value driver', async t => {
  const square = (x: unknown) => (x as number) * (x as number);
  const c = pipe(square);
  const last = await drain(c(7));
  t.equal(last, 49);
});

test('types: JSONC file variants are callable', t => {
  t.equal(typeof jsoncParseFile(), 'function');
  t.equal(typeof jsoncStringerToFile('/dev/null'), 'function');
  const p: Promise<void> = jsoncVerifyFile('/dev/null');
  t.ok(p instanceof Promise);
  // suppress unhandled-rejection — verifying /dev/null will fail
  p.catch(() => {});
});
