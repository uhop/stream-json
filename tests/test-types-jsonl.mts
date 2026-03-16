import type {Duplex, Transform} from 'node:stream';

import test from 'tape-six';
import JsonlParser from '../src/jsonl/parser.js';
import JsonlStringer from '../src/jsonl/stringer.js';

test('types: JsonlParser', async t => {
  await t.test('factories', t => {
    const jp: Duplex = JsonlParser.make();
    t.ok(jp);

    const jp2: Duplex = JsonlParser.make({reviver: (k, v) => v, checkErrors: true});
    t.ok(jp2);

    const jp3: Duplex = JsonlParser.parser();
    t.ok(jp3);

    const jp4: Duplex = JsonlParser.asStream({errorIndicator: null});
    t.ok(jp4);
  });

  await t.test('is Duplex', t => {
    const jp = JsonlParser.make();
    const isDuplex: Duplex = jp;
    t.ok(isDuplex);
  });

  await t.test('functional form', t => {
    const fn = JsonlParser();
    t.ok(typeof fn === 'function');
  });

  await t.test('checkedParse', t => {
    const parsed: any = JsonlParser.checkedParse('{"a":1}');
    t.deepEqual(parsed, {a: 1});

    const parsedWithReviver: any = JsonlParser.checkedParse('1', (k, v) => v, undefined);
    t.equal(parsedWithReviver, 1);
  });

  await t.test('JsonlParserOptions interface', t => {
    const opts: JsonlParser.JsonlParserOptions = {
      reviver: (k, v) => v,
      errorIndicator: null,
      checkErrors: true
    };
    t.ok(opts);
  });

  await t.test('JsonlItem interface', t => {
    const item: JsonlParser.JsonlItem = {key: 0, value: {a: 1}};
    t.equal(item.key, 0);
  });
});

test('types: JsonlStringer', async t => {
  await t.test('factories', t => {
    const js: Transform = JsonlStringer.make();
    t.ok(js);

    const js2: Transform = JsonlStringer.make({separator: '\r\n', replacer: (k, v) => v});
    t.ok(js2);

    const js3: Transform = JsonlStringer.stringer();
    t.ok(js3);

    const js4: Transform = JsonlStringer.asStream({separator: '\n'});
    t.ok(js4);
  });

  await t.test('is Transform', t => {
    const js = JsonlStringer.make();
    const isTransform: Transform = js;
    t.ok(isTransform);
  });

  await t.test('functional form', t => {
    const js: Transform = JsonlStringer();
    t.ok(js);
  });

  await t.test('JsonlStringerOptions interface', t => {
    const opts: JsonlStringer.JsonlStringerOptions = {
      replacer: (k, v) => v,
      separator: '\n'
    };
    t.ok(opts);
  });
});
