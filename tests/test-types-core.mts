import type {Duplex, Writable} from 'node:stream';

import test from 'tape-six';
import make from '../src/index.js';
import parser from '../src/parser.js';
import Assembler from '../src/assembler.js';
import disassembler from '../src/disassembler.js';
import stringer from '../src/stringer.js';
import emitter from '../src/emitter.js';

test('types: index (make)', t => {
  const mainStream: Duplex = make();
  t.ok(mainStream);

  const mainStreamOpts: Duplex = make({packValues: true});
  t.ok(mainStreamOpts);

  const p: typeof parser = make.parser;
  t.equal(p, parser);
});

test('types: Assembler', async t => {
  await t.test('constructor and factory', t => {
    const asm = new Assembler();
    t.ok(asm);

    const asmWithOpts = new Assembler({reviver: (k, v) => v, numberAsString: true});
    t.ok(asmWithOpts);

    const asm3: Assembler = Assembler.assembler();
    t.ok(asm3);
  });

  await t.test('static connectTo', t => {
    const asm2: Assembler = Assembler.connectTo(parser.asStream());
    t.ok(asm2);
  });

  await t.test('instance properties', t => {
    const asm = new Assembler();
    const stack: any[] = asm.stack;
    t.ok(Array.isArray(stack));

    const key: string | null = asm.key;
    t.equal(key, null);

    const done: boolean = asm.done;
    t.equal(done, true);

    const depth: number = asm.depth;
    t.equal(typeof depth, 'number');

    const path: (string | number)[] = asm.path;
    t.ok(Array.isArray(path));
  });

  await t.test('instance methods', t => {
    const asm = new Assembler();
    asm.startObject();
    asm.keyValue('test');
    asm.stringValue('hello');
    asm.endObject();
    t.ok(asm.done);
  });

  await t.test('tapChain', t => {
    const asm = new Assembler();
    const result: any = asm.tapChain({name: 'startObject'});
    t.equal(typeof asm.tapChain, 'function');
  });

  await t.test('AssemblerOptions interface', t => {
    const opts: Assembler.AssemblerOptions = {reviver: (k, v) => v};
    t.ok(opts);
  });
});

test('types: disassembler', async t => {
  await t.test('factory', t => {
    const fn = disassembler();
    t.equal(typeof fn, 'function');

    const fnOpts = disassembler({packValues: true, replacer: (k, v) => v});
    t.equal(typeof fnOpts, 'function');

    const fnArr = disassembler({replacer: ['a', 'b']});
    t.equal(typeof fnArr, 'function');
  });

  await t.test('generator return', t => {
    const fn = disassembler();
    const gen: Generator<parser.Token, void, undefined> = fn({a: 1});
    t.ok(gen);
    t.equal(typeof gen.next, 'function');
  });

  await t.test('asStream', t => {
    const stream: Duplex = disassembler.asStream();
    t.ok(stream);

    const streamOpts: Duplex = disassembler.asStream({streamValues: false});
    t.ok(streamOpts);
  });

  await t.test('DisassemblerOptions interface', t => {
    const opts: disassembler.DisassemblerOptions = {packStrings: true, streamKeys: false};
    t.ok(opts);
  });
});

test('types: stringer', t => {
  const fn = stringer();
  t.equal(typeof fn, 'function');

  const s1: Duplex = stringer.asStream();
  t.ok(s1);

  const s2: Duplex = stringer.asStream({useValues: true, makeArray: true});
  t.ok(s2);

  const s3: Duplex = stringer.stringer({useKeyValues: false, useStringValues: true, useNumberValues: false});
  t.ok(s3);

  const opts: stringer.StringerOptions = {useValues: true, makeArray: false};
  t.ok(opts);
});

test('types: emitter', t => {
  const e1: Writable = emitter();
  t.ok(e1);

  const e2: Writable = emitter.emitter();
  t.ok(e2);
});
