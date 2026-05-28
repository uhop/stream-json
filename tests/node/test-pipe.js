import {test} from 'tape-six';
import {flushable, none} from 'stream-chain/core';

import pipe from '../../src/core/utils/pipe.js';
import drain from '../../src/core/utils/drain.js';

test.asPromise('pipe: drives a single value through and flushes', async (t, resolve) => {
  let flushed = false;
  const sink = flushable(
    v => {
      t.equal(v, 'in');
      return 'pre-flush';
    },
    () => {
      flushed = true;
      return 'post-flush';
    }
  );
  const last = await drain(pipe(sink)('in'));
  t.ok(flushed, 'sink final() ran');
  t.equal(last, 'post-flush', 'last value is from the flush phase');
  resolve();
});

test.asPromise('pipe: composes multiple stages and flushes only flushable ones', async (t, resolve) => {
  const events = [];
  const transform = v => v * 2;
  const sink = flushable(
    v => {
      events.push(['write', v]);
      return none;
    },
    () => {
      events.push(['flush']);
      return none;
    }
  );
  await drain(pipe(transform, sink)(21));
  t.deepEqual(events, [['write', 42], ['flush']]);
  resolve();
});

test.asPromise('pipe: each call constructs a fresh gen (stateless stages can be reused)', async (t, resolve) => {
  const square = v => v * v;
  const p = pipe(square);
  t.equal(await drain(p(3)), 9);
  t.equal(await drain(p(4)), 16);
  t.equal(await drain(p(5)), 25);
  resolve();
});

test.asPromise('pipe: propagates errors from stages', async (t, resolve) => {
  const boom = () => {
    throw new Error('stage failed');
  };
  try {
    await drain(pipe(boom)('x'));
    t.fail('expected throw');
  } catch (e) {
    t.equal(e.message, 'stage failed');
  }
  resolve();
});
