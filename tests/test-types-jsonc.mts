import type {Duplex} from 'node:stream';

import test from 'tape-six';
import jsoncParser from '../src/jsonc/parser.js';
import jsoncStringer from '../src/jsonc/stringer.js';

test('types: jsoncParser', async t => {
  await t.test('factories', t => {
    const jp1: Duplex = jsoncParser.asStream();
    t.ok(jp1);

    const jp2: Duplex = jsoncParser.asStream({streamWhitespace: false, streamComments: false});
    t.ok(jp2);

    const jp3 = jsoncParser.parser();
    t.equal(typeof jp3, 'function');

    const jp4 = jsoncParser.jsoncParser();
    t.equal(typeof jp4, 'function');
  });

  await t.test('functional form', t => {
    const fn = jsoncParser();
    t.ok(typeof fn === 'function');
  });

  await t.test('JsoncParserOptions interface', t => {
    const opts: jsoncParser.JsoncParserOptions = {
      packKeys: true,
      packStrings: true,
      packNumbers: true,
      streamWhitespace: true,
      streamComments: true,
      jsonStreaming: false
    };
    t.ok(opts);
  });

  await t.test('Token interface', t => {
    const tok: jsoncParser.Token = {name: 'comment', value: '// hello\n'};
    t.equal(tok.name, 'comment');

    const structural: jsoncParser.Token = {name: 'startObject'};
    t.equal(structural.value, undefined);
  });
});

test('types: jsoncStringer', async t => {
  await t.test('factories', t => {
    const js1: Duplex = jsoncStringer.asStream();
    t.ok(js1);

    const js2: Duplex = jsoncStringer.asStream({useValues: true});
    t.ok(js2);

    const js3 = jsoncStringer.stringer();
    t.equal(typeof js3, 'function');

    const js4 = jsoncStringer.jsoncStringer();
    t.equal(typeof js4, 'function');
  });

  await t.test('functional form', t => {
    const fn = jsoncStringer();
    t.ok(typeof fn === 'function');
  });

  await t.test('JsoncStringerOptions interface', t => {
    const opts: jsoncStringer.JsoncStringerOptions = {
      useValues: true,
      useKeyValues: false,
      makeArray: false
    };
    t.ok(opts);
  });
});
