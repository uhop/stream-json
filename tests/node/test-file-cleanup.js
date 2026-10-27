import test from 'tape-six';
import {open, mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline, Readable} from 'node:stream';

import chain, {stop} from 'stream-chain';

import stringerToFile from '../../src/file/stringer.js';
import jsoncStringerToFile from '../../src/file/jsonc/stringer.js';
import disassembler from '../../src/core/disassembler.js';

// FileHandle's write lives on the prototype, so a patch there sees the handle a sink
// opens; close is an own property, so it is wrapped on that handle to signal the release.
const watchHandle = async () => {
  const probe = await open('/dev/null', 'w');
  const proto = Object.getPrototypeOf(probe);
  await probe.close();
  const write = proto.write;
  const watch = {handle: null, released: null};
  let signal;
  watch.released = new Promise(resolve => (signal = resolve));
  proto.write = function (...args) {
    if (!watch.handle) {
      watch.handle = this;
      const close = this.close;
      this.close = (...a) => close.apply(this, a).finally(signal);
    }
    return write.apply(this, args);
  };
  watch.restore = () => (proto.write = write);
  return watch;
};

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'sj-file-cleanup-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

for (const [name, make] of [
  ['stringerToFile', stringerToFile],
  ['jsonc stringerToFile', jsoncStringerToFile]
]) {
  test(`${name}: close() releases the file handle`, async t => {
    await inTempDir(async dir => {
      const sink = make(join(dir, 'close.json'), {writeBlockSize: 1});
      const watch = await watchHandle();
      try {
        for await (const _ of sink({name: 'startArray'}));
      } finally {
        watch.restore();
      }
      t.ok(watch.handle, 'a block write opened the file');
      t.notEqual(watch.handle?.fd, -1, 'the handle stays open between blocks');
      await sink.close();
      t.equal(watch.handle?.fd, -1, 'close() released the handle');
      await t.rejects(
        (async () => {
          for await (const _ of sink({name: 'endArray'}));
        })(),
        'a call after close() throws'
      );
    });
  });

  test(`${name}: a torn-down chain releases the file handle without close()`, async t => {
    await inTempDir(async dir => {
      const sourceErr = new Error('source boom');
      const watch = await watchHandle();
      let caught;
      try {
        caught = await new Promise(done => {
          const c = chain([
            function* () {
              yield {name: 'startArray'};
              throw sourceErr;
            },
            make(join(dir, 'abort.json'), {writeBlockSize: 1})
          ]);
          pipeline(Readable.from([0]), c, done);
        });
        await watch.released;
      } finally {
        watch.restore();
      }
      t.equal(caught, sourceErr, 'the source error reaches pipeline()');
      t.ok(watch.handle, 'a block write opened the file');
      t.equal(watch.handle?.fd, -1, 'the teardown released the handle');
    });
  });

  test(`${name}: a stop before the sink still writes the buffered output`, async t => {
    await inTempDir(async dir => {
      const path = join(dir, 'stop.json');
      const c = chain([x => (x === 3 ? stop : x), disassembler(), make(path, {makeArray: true})]);
      await new Promise((resolve, reject) => {
        c.on('end', resolve);
        c.on('error', reject);
        c.resume();
        for (const x of [1, 2, 3, 4]) c.write(x);
        c.end();
      });
      t.equal(await readFile(path, 'utf8'), '[1,2]', 'the values before the stop reached the file');
    });
  });
}
