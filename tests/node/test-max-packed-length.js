import test from 'tape-six';
import chain from 'stream-chain';
import {Readable} from 'node:stream';

import {parser} from '../../src/index.js';
import {parser as jsoncParser} from '../../src/jsonc/parser.js';
import DEFAULT_MAX_PACKED_LENGTH from '../../src/core/utils/max-packed-length.js';

const split = (text, size) => Array.from({length: Math.ceil(text.length / size)}, (_, i) => text.slice(i * size, (i + 1) * size));

const failure = (component, chunks, options) =>
  new Promise(resolve => {
    const pipeline = chain([Readable.from(chunks), component(options)]);
    pipeline.on('data', () => {});
    pipeline.on('end', () => resolve(null));
    pipeline.on('error', resolve);
  });

const long = 'abcdefghijklmnopqrstuvwxyz0123';

const documents = {
  string: `["${long}"]`,
  key: `{"${long}":1}`,
  number: `[${'1234567890'.repeat(3)}]`
};

for (const [name, component] of Object.entries({parser, 'JSONC parser': jsoncParser})) {
  test(`${name}: maxPackedLength`, async t => {
    for (const [kind, text] of Object.entries(documents)) {
      const chunks = split(text, 10);
      t.ok((await failure(component, chunks, {maxPackedLength: 15})) instanceof RangeError, `a packed ${kind} held past the limit`);
      t.equal(await failure(component, chunks, {maxPackedLength: 30}), null, `a packed ${kind} within the limit`);
      t.equal(await failure(component, chunks, {maxPackedLength: Infinity}), null, `Infinity removes the limit for a ${kind}`);
    }
    t.equal(await failure(component, split(documents.string, 10), {maxPackedLength: 15, packStrings: false}), null, 'a streamed string is not held');
    t.equal(await failure(component, split(documents.key, 10), {maxPackedLength: 15, packKeys: false}), null, 'a streamed key is not held');
    t.equal(await failure(component, split(documents.number, 10), {maxPackedLength: 15, packNumbers: false}), null, 'a streamed number is not held');
  });
}

test('JSONC parser: maxPackedLength covers packed comments', async t => {
  const chunks = split(`/* ${long} */ 1`, 10);
  t.ok((await failure(jsoncParser, chunks, {maxPackedLength: 15})) instanceof RangeError, 'a packed comment held past the limit');
  t.equal(await failure(jsoncParser, chunks, {maxPackedLength: 40}), null, 'a packed comment within the limit');
  t.equal(await failure(jsoncParser, chunks, {maxPackedLength: 15, packComments: false}), null, 'a streamed comment is not held');
});

test('maxPackedLength defaults to 256 Mi code units', t => {
  t.equal(DEFAULT_MAX_PACKED_LENGTH, 2 ** 28);
});
