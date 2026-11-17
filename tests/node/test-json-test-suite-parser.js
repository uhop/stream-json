import {readFile, readdir} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {basename, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../../src/parser.js';
import stringer from '../../src/stringer.js';
import streamValues from '../../src/streamers/stream-values.js';

const suiteDirectory = join(dirname(fileURLToPath(import.meta.url)), '../data/json-test-suite');
const rejectedIndeterminate = new Set(['i_string_UTF-16LE_with_BOM.json', 'i_string_utf16BE_no_BOM.json', 'i_string_utf16LE_no_BOM.json']);

const listCases = async directory =>
  (await readdir(join(suiteDirectory, directory)))
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => join(suiteDirectory, directory, name));

const inputStream = (buffer, bytewise) => Readable.from(bytewise ? Array.from(buffer, byte => Buffer.from([byte])) : [buffer]);

const parseValues = (buffer, bytewise) =>
  new Promise((resolve, reject) => {
    const values = [],
      pipeline = chain([inputStream(buffer, bytewise), parser(), streamValues()]);

    pipeline.on('data', item => (values[item.key] = item.value));
    pipeline.on('error', error => resolve({accepted: false, error}));
    pipeline.on('end', () => resolve({accepted: true, values}));
  });

const stringify = buffer =>
  new Promise((resolve, reject) => {
    let output = '';
    const pipeline = chain([inputStream(buffer, false), parser(), stringer()]);

    pipeline.on('data', chunk => (output += chunk));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(output));
  });

test.asPromise('JSONTestSuite parser: test_parsing', (t, resolve, reject) => {
  const run = async () => {
    for (const file of await listCases('test_parsing')) {
      const name = basename(file),
        buffer = await readFile(file),
        oneChunk = await parseValues(buffer, false),
        bytewise = await parseValues(buffer, true);
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

      t.equal(oneChunk.accepted, expectedAccepted, `${name}: one chunk has the expected outcome`);
      t.equal(bytewise.accepted, expectedAccepted, `${name}: one byte per chunk has the expected outcome`);
      t.equal(bytewise.accepted, oneChunk.accepted, `${name}: chunking does not change the outcome`);

      if (name.startsWith('y_') && oneChunk.accepted && bytewise.accepted) {
        const expected = JSON.parse(new TextDecoder().decode(buffer));
        t.equal(oneChunk.values.length, 1, `${name}: one chunk emits one root value`);
        t.deepEqual(oneChunk.values[0], expected, `${name}: one chunk streams the expected value`);
        t.equal(bytewise.values.length, 1, `${name}: one byte per chunk emits one root value`);
        t.deepEqual(bytewise.values[0], expected, `${name}: one byte per chunk streams the expected value`);
      }
    }
  };

  run().then(resolve, reject);
});

test.asPromise('JSONTestSuite parser: test_transform', (t, resolve, reject) => {
  const run = async () => {
    for (const file of await listCases('test_transform')) {
      const name = basename(file),
        buffer = await readFile(file);
      let output;

      try {
        output = await stringify(buffer);
      } catch (error) {
        t.fail(`${name}: parser rejected the input (${error.message})`);
        continue;
      }

      t.pass(`${name}: parser accepted the input`);
      try {
        const repeated = await stringify(Buffer.from(output));
        t.equal(repeated, output, `${name}: parse and stringify output is stable`);
      } catch (error) {
        t.fail(`${name}: stringer output could not be parsed again (${error.message})`);
      }
    }
  };

  run().then(resolve, reject);
});
