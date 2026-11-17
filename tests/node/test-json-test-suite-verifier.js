import {readFile, readdir} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline as runPipeline} from 'node:stream/promises';
import {basename, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import test from 'tape-six';

import verifier from '../../src/utils/verifier.js';

const suiteDirectory = join(dirname(fileURLToPath(import.meta.url)), '../data/json-test-suite');
const rejectedIndeterminate = new Set(['i_string_UTF-16LE_with_BOM.json', 'i_string_utf16BE_no_BOM.json', 'i_string_utf16LE_no_BOM.json']);

const listCases = async directory =>
  (await readdir(join(suiteDirectory, directory)))
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => join(suiteDirectory, directory, name));

const inputStream = (buffer, bytewise) => Readable.from(bytewise ? Array.from(buffer, byte => Buffer.from([byte])) : [buffer]);

const verify = async (buffer, bytewise) => {
  try {
    await runPipeline(inputStream(buffer, bytewise), verifier.asStream({jsonStreaming: false}));
    return null;
  } catch (error) {
    return error;
  }
};

const hasErrorLocation = error => error && Number.isInteger(error.line) && Number.isInteger(error.pos) && Number.isInteger(error.offset);

test.asPromise('JSONTestSuite verifier: test_parsing', (t, resolve, reject) => {
  const run = async () => {
    for (const file of await listCases('test_parsing')) {
      const name = basename(file),
        buffer = await readFile(file),
        oneChunk = await verify(buffer, false),
        bytewise = await verify(buffer, true);
      let expectedAccepted;

      if (name.startsWith('y_')) {
        expectedAccepted = true;
      } else if (name.startsWith('n_')) {
        expectedAccepted = false;
      } else if (name.startsWith('i_')) {
        expectedAccepted = !rejectedIndeterminate.has(name);
      } else {
        throw new Error(`Unexpected JSONTestSuite test_parsing filename: ${name}`);
      }

      t.equal(oneChunk === null, expectedAccepted, `${name}: one chunk has the expected outcome`);
      t.equal(bytewise === null, expectedAccepted, `${name}: one byte per chunk has the expected outcome`);
      t.equal(bytewise === null, oneChunk === null, `${name}: chunking does not change the outcome`);

      if (name.startsWith('n_')) {
        t.ok(hasErrorLocation(oneChunk), `${name}: one-chunk error has integer line, pos, and offset`);
        t.ok(hasErrorLocation(bytewise), `${name}: bytewise error has integer line, pos, and offset`);
      }
    }
  };

  run().then(resolve, reject);
});
