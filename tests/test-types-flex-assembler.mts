import test from 'tape-six';
import FlexAssembler from '../src/utils/flex-assembler.js';
import parser from '../src/parser.js';

test('types: FlexAssembler', async t => {
  await t.test('constructor and factory', t => {
    const asm = new FlexAssembler();
    t.ok(asm);

    const asm2 = new FlexAssembler({
      objectRules: [{filter: () => true, create: () => new Map(), add: (m, k, v) => m.set(k, v)}],
      arrayRules: [{filter: 'items', create: () => new Set(), add: (s, v) => s.add(v)}],
      pathSeparator: '/',
      reviver: (k, v) => v,
      numberAsString: true
    });
    t.ok(asm2);

    const asm3: FlexAssembler = FlexAssembler.flexAssembler();
    t.ok(asm3);
  });

  await t.test('static connectTo', t => {
    const asm: FlexAssembler = FlexAssembler.connectTo(parser.asStream());
    t.ok(asm);
  });

  await t.test('instance properties', t => {
    const asm = new FlexAssembler();

    const stack: FlexAssembler.StackEntry[] = asm.objectStack;
    t.ok(Array.isArray(stack));

    const keyStack: (string | number)[] = asm.keyStack;
    t.ok(Array.isArray(keyStack));

    const key: string | null = asm.key;
    t.equal(key, null);

    const done: boolean = asm.done;
    t.equal(done, true);

    const isArray: boolean = asm.isArray;
    t.equal(isArray, false);

    const arrayIndex: number = asm.arrayIndex;
    t.equal(typeof arrayIndex, 'number');

    const depth: number = asm.depth;
    t.equal(typeof depth, 'number');

    const path: (string | number)[] = asm.path;
    t.ok(Array.isArray(path));
  });

  await t.test('instance methods', t => {
    const asm = new FlexAssembler();
    asm.startObject();
    asm.keyValue('test');
    asm.stringValue('hello');
    asm.endObject();
    t.ok(asm.done);
  });

  await t.test('tapChain', t => {
    const asm = new FlexAssembler();
    const result: any = asm.tapChain({name: 'startObject'});
    t.equal(typeof asm.tapChain, 'function');
  });

  await t.test('rule interfaces', t => {
    const objRule: FlexAssembler.ObjectRule = {
      filter: /^data\b/,
      create: path => new Map(),
      add: (container, key, value) => container.set(key, value),
      finalize: container => container
    };
    t.ok(objRule);

    const arrRule: FlexAssembler.ArrayRule = {
      filter: 'items',
      create: path => new Set(),
      add: (container, value) => container.add(value)
    };
    t.ok(arrRule);

    const opts: FlexAssembler.FlexAssemblerOptions = {
      objectRules: [objRule],
      arrayRules: [arrRule],
      pathSeparator: '.',
      reviver: (k, v) => v,
      numberAsString: false
    };
    t.ok(opts);
  });

  await t.test('filter types', t => {
    const strFilter: FlexAssembler.Filter = 'data.items';
    t.ok(strFilter);

    const reFilter: FlexAssembler.Filter = /^data\b/;
    t.ok(reFilter);

    const fnFilter: FlexAssembler.Filter = (path: (string | number)[]) => path.length > 0;
    t.ok(fnFilter);

    const fnFilter2: FlexAssembler.FilterFunction = path => path.length === 1;
    t.ok(fnFilter2);
  });
});
