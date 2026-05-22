import test from 'tape-six';

import jsonlStringer from '../../src/web/jsonl/stringer.js';

import {writeAndCollect} from '../web-helpers.js';

test.asPromise('jsonlStringer (web): default separator', async (t, resolve, reject) => {
  try {
    const out = await writeAndCollect(jsonlStringer.asWebStream(), [{a: 1}, {b: 2}, {c: 3}]);
    t.equal(out.join(''), '{"a":1}\n{"b":2}\n{"c":3}');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonlStringer (web): custom separator', async (t, resolve, reject) => {
  try {
    const out = await writeAndCollect(jsonlStringer.asWebStream({separator: '\r\n'}), [{a: 1}, {b: 2}, {c: 3}]);
    t.equal(out.join(''), '{"a":1}\r\n{"b":2}\r\n{"c":3}');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonlStringer (web): prefix + suffix', async (t, resolve, reject) => {
  try {
    const out = await writeAndCollect(jsonlStringer.asWebStream({prefix: '[', suffix: ']', separator: ','}), [1, 2, 3]);
    t.equal(out.join(''), '[1,2,3]');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonlStringer (web): empty input emits prefix + suffix by default', async (t, resolve, reject) => {
  try {
    const out = await writeAndCollect(jsonlStringer.asWebStream({prefix: '[', suffix: ']'}), []);
    t.equal(out.join(''), '[]');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonlStringer (web): empty input emits emptyValue when set', async (t, resolve, reject) => {
  try {
    const out = await writeAndCollect(jsonlStringer.asWebStream({prefix: '[', suffix: ']', emptyValue: 'null'}), []);
    t.equal(out.join(''), 'null');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonlStringer (web): factory call equals asWebStream', async (t, resolve, reject) => {
  try {
    const out = await writeAndCollect(jsonlStringer(), [{a: 1}, {b: 2}]);
    t.equal(out.join(''), '{"a":1}\n{"b":2}');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('jsonlStringer (web): replacer + space', async (t, resolve, reject) => {
  try {
    const out = await writeAndCollect(
      jsonlStringer.asWebStream({
        replacer: (_k, v) => (typeof v === 'number' ? v * 2 : v),
        space: 2
      }),
      [{a: 1}, {b: 2}]
    );
    t.equal(out.join(''), '{\n  "a": 2\n}\n{\n  "b": 4\n}');
    resolve();
  } catch (e) {
    reject(e);
  }
});
