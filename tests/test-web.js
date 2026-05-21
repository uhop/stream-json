import test from 'tape-six';

import parserWebStream, {parser as parserFromWeb} from '../src/web/index.js';
import parserWebFactory, {parser as parserFromWebSubpath} from '../src/web/parser.js';
import coreParser from '../src/core/parser.js';

test.asPromise('web: parserWebStream produces Web TransformStream pair', async (t, resolve, reject) => {
  try {
    const pair = parserWebStream();
    t.ok(pair.readable instanceof ReadableStream, 'has ReadableStream');
    t.ok(pair.writable instanceof WritableStream, 'has WritableStream');

    const tokens = [];
    const reader = pair.readable.getReader();
    const writer = pair.writable.getWriter();

    const readLoop = (async () => {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        tokens.push(value);
      }
    })();

    await writer.write('[1,2,"x"]');
    await writer.close();
    await readLoop;

    const names = tokens.map(t => t.name).filter(Boolean);
    t.ok(names.includes('startArray'), 'startArray emitted');
    t.ok(names.includes('endArray'), 'endArray emitted');
    t.ok(names.includes('numberValue') || names.includes('numberChunk'), 'number tokens emitted');
    t.ok(names.includes('stringValue') || names.includes('stringChunk'), 'string tokens emitted');
    resolve();
  } catch (err) {
    reject(err);
  }
});

test('web: subpath exports the same parser symbol', t => {
  t.equal(parserFromWeb, parserFromWebSubpath, 'src/web.js re-exports src/web/parser.js');
  t.equal(parserFromWeb, coreParser, 'all entries share the same core parser instance');
});

test('web: parser.asWebStream is exposed on the web parser', t => {
  t.equal(typeof parserWebFactory.asWebStream, 'function');
});
