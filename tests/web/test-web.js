import test from 'tape-six';

import parserWebStream, {parser as parserFromWeb} from '../../src/web/index.js';
import parserWebFactory, {parser as parserFromWebSubpath} from '../../src/web/parser.js';
import coreParser from '../../src/core/parser.js';

// Feature probe: `stream-chain`'s `asWebStream` (src/asWebStream.js) relies on
// `WritableStreamDefaultController.signal` (WHATWG Streams §4.5.2) to wake
// blocked writes on abort. Node and Deno expose it; Bun (≤1.3.14) does not.
// Trackers: Bun-side at https://github.com/oven-sh/bun/issues/31156, fix /
// fallback consideration on the `stream-chain` side at
// https://github.com/uhop/stream-chain (the dependency on the spec attribute
// lives there, not here — stream-json's wrapper just calls into
// `parser.asWebStream`). Skip the runtime test on runtimes that lack the
// signal so the suite still passes there; the unit tests below (which only
// inspect the attached factory shape) still run.
let hasWritableControllerSignal = false;
try {
  await new Promise(resolve => {
    new WritableStream({
      start(controller) {
        hasWritableControllerSignal = controller.signal instanceof AbortSignal;
        resolve();
      },
      write() {}
    })
      .getWriter()
      .write('x')
      .catch(() => {});
  });
} catch {
  // ignore probe errors
}

test.asPromise('web: parserWebStream produces Web TransformStream pair', async (t, resolve, reject) => {
  if (!hasWritableControllerSignal) {
    t.comment('skipped: runtime lacks WritableStreamDefaultController.signal (e.g. Bun ≤1.3.14)');
    resolve();
    return;
  }
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
