import type {Duplex, Transform} from 'node:stream';

import test from 'tape-six';
import jsonlParser from '../src/jsonl/parser.js';
import jsonlStringer from '../src/jsonl/stringer.js';

test('types: jsonlParser', async t => {
  await t.test('factories', t => {
    const jp1: Duplex = jsonlParser.asStream();
    t.ok(jp1);

    const jp2: Duplex = jsonlParser.asStream({reviver: (k, v) => v, checkErrors: true});
    t.ok(jp2);

    const jp3 = jsonlParser.parser();
    t.equal(typeof jp3, 'function');
  });

  await t.test('functional form', t => {
    const fn = jsonlParser();
    t.ok(typeof fn === 'function');
  });

  await t.test('checkedParse', t => {
    const parsed: any = jsonlParser.checkedParse('{"a":1}');
    t.deepEqual(parsed, {a: 1});

    const parsedWithReviver: any = jsonlParser.checkedParse('1', (k, v) => v, undefined);
    t.equal(parsedWithReviver, 1);
  });

  await t.test('JsonlParserOptions interface', t => {
    const opts: jsonlParser.JsonlParserOptions = {
      reviver: (k, v) => v,
      errorIndicator: null,
      checkErrors: true
    };
    t.ok(opts);
  });

  await t.test('JsonlItem interface', t => {
    const item: jsonlParser.JsonlItem = {key: 0, value: {a: 1}};
    t.equal(item.key, 0);
  });
});

test('types: jsonlStringer', async t => {
  await t.test('factories', t => {
    const js1: Transform = jsonlStringer();
    t.ok(js1);

    const js2: Transform = jsonlStringer({separator: '\r\n', replacer: (k, v) => v});
    t.ok(js2);

    const js3: Transform = jsonlStringer.stringer();
    t.ok(js3);
  });

  await t.test('JsonlStringerOptions interface', t => {
    const opts: jsonlStringer.JsonlStringerOptions = {
      replacer: (k, v) => v,
      separator: '\n'
    };
    t.ok(opts);
  });
});
