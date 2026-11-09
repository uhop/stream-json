import test from 'tape-six';
import chain from 'stream-chain';
import {Readable} from 'node:stream';

import {parser} from '../../src/index.js';
import {verifier} from '../../src/utils/verifier.js';
import {parser as jsoncParser} from '../../src/jsonc/parser.js';
import {verifier as jsoncVerifier} from '../../src/jsonc/verifier.js';

const components = {parser, verifier, 'JSONC parser': jsoncParser, 'JSONC verifier': jsoncVerifier};

const arrays = depth => '['.repeat(depth) + ']'.repeat(depth);
const objects = depth => '{"a":'.repeat(depth) + '1' + '}'.repeat(depth);

const failure = (component, input, options) =>
  new Promise(resolve => {
    const pipeline = chain([Readable.from([input]), component(options)]);
    pipeline.on('data', () => {});
    pipeline.on('end', () => resolve(null));
    pipeline.on('error', resolve);
  });

for (const [name, component] of Object.entries(components)) {
  test(`${name}: maxDepth`, async t => {
    t.equal(await failure(component, arrays(3), {maxDepth: 3}), null, 'arrays nested exactly maxDepth deep');
    t.equal(await failure(component, objects(3), {maxDepth: 3}), null, 'objects nested exactly maxDepth deep');
    t.ok((await failure(component, arrays(4), {maxDepth: 3})) instanceof RangeError, 'arrays one level past');
    t.ok((await failure(component, objects(4), {maxDepth: 3})) instanceof RangeError, 'objects one level past');
    t.ok((await failure(component, '['.repeat(4), {maxDepth: 3})) instanceof RangeError, 'an unclosed document');
    t.equal(await failure(component, arrays(1024)), null, 'the default accepts 1024 levels');
    t.ok((await failure(component, arrays(1025))) instanceof RangeError, 'the default refuses 1025 levels');
    t.equal(await failure(component, arrays(2000), {maxDepth: Infinity}), null, 'Infinity removes the limit');
    t.equal(await failure(component, arrays(3) + arrays(3), {maxDepth: 3, jsonStreaming: true}), null, 'depth is per value under jsonStreaming');
  });
}

test('verifier: the depth error reports its location', async t => {
  const error = await failure(verifier, '[[[[', {maxDepth: 3});
  t.equal(error.offset, 3);
  t.equal(error.line, 1);
  t.equal(error.pos, 4);
});
