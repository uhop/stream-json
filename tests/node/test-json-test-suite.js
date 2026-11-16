import {createReadStream} from 'node:fs';
import {readdir} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {basename, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../../src/parser.js';
import stringer from '../../src/stringer.js';
import verifier from '../../src/utils/verifier.js';

const suiteDirectory = join(dirname(fileURLToPath(import.meta.url)), '../data/json-test-suite');

const listCases = async directory =>
  (await readdir(join(suiteDirectory, directory)))
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => join(suiteDirectory, directory, name));

const isParserError = error => error && Number.isInteger(error.line) && Number.isInteger(error.pos) && Number.isInteger(error.offset);

const verify = file =>
  new Promise((resolve, reject) => {
    const input = createReadStream(file),
      stream = verifier.asStream({jsonStreaming: false});

    input.on('error', reject);
    stream.on('error', resolve);
    stream.on('finish', () => resolve(null));
    input.pipe(stream);
  });

const stringify = input =>
  new Promise((resolve, reject) => {
    let output = '';
    const pipeline = chain([input, parser(), stringer()]);

    pipeline.on('data', data => (output += data));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(output));
  });

test.asPromise('JSONTestSuite: test_parsing', (t, resolve, reject) => {
  const run = async () => {
    for (const file of await listCases('test_parsing')) {
      const name = basename(file),
        error = await verify(file);

      if (name.startsWith('y_')) {
        t.equal(error, null, `${name}: valid JSON is accepted`);
      } else if (name.startsWith('n_')) {
        t.ok(isParserError(error), `${name}: invalid JSON is rejected`);
      } else if (name.startsWith('i_')) {
        t.ok(error === null || isParserError(error), `${name}: optional input is accepted or rejected by the parser`);
      } else {
        throw new Error(`Unexpected JSONTestSuite test_parsing filename: ${name}`);
      }
    }
  };

  run().then(resolve, reject);
});

test.asPromise('JSONTestSuite: test_transform', (t, resolve, reject) => {
  const run = async () => {
    for (const file of await listCases('test_transform')) {
      const name = basename(file);
      let output;

      try {
        output = await stringify(createReadStream(file));
      } catch (error) {
        t.ok(isParserError(error), `${name}: optional input is accepted or rejected by the parser`);
        continue;
      }

      try {
        const repeated = await stringify(Readable.from([Buffer.from(output)]));
        t.equal(repeated, output, `${name}: parser and stringer output is stable`);
      } catch (error) {
        t.fail(`${name}: stringer output could not be parsed again (${error.message})`);
      }
    }
  };

  run().then(resolve, reject);
});
