import type {Transform} from 'node:stream';

import test from 'tape-six';
import JsonlParser from '../src/jsonl/parser.js';
import JsonlStringer from '../src/jsonl/stringer.js';

test('types: JsonlParser', async t => {
  await t.test('constructors and factories', t => {
    const jp: JsonlParser = JsonlParser.make();
    t.ok(jp);

    const jp2: JsonlParser = JsonlParser.make({reviver: (k, v) => v, checkErrors: true});
    t.ok(jp2);

    const jp3: JsonlParser = JsonlParser.parser();
    t.ok(jp3);

    const jp4: JsonlParser = new JsonlParser({errorIndicator: null});
    t.ok(jp4);
  });

  await t.test('extends Transform', t => {
    const jp = JsonlParser.make();
    const isTransform: Transform = jp;
    t.ok(isTransform);
  });

  await t.test('static checkedParse', t => {
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
  await t.test('constructors and factories', t => {
    const js: JsonlStringer = JsonlStringer.make();
    t.ok(js);

    const js2: JsonlStringer = JsonlStringer.make({separator: '\r\n', replacer: (k, v) => v});
    t.ok(js2);

    const js3: JsonlStringer = JsonlStringer.stringer();
    t.ok(js3);

    const js4: JsonlStringer = new JsonlStringer({separator: '\n'});
    t.ok(js4);
  });

  await t.test('extends Transform', t => {
    const js = JsonlStringer.make();
    const isTransform: Transform = js;
    t.ok(isTransform);
  });

  await t.test('JsonlStringerOptions interface', t => {
    const opts: JsonlStringer.JsonlStringerOptions = {
      replacer: (k, v) => v,
      separator: '\n'
    };
    t.ok(opts);
  });
});
