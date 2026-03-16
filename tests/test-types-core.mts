import {Duplex} from 'node:stream';
import {EventEmitter} from 'node:events';

import make from '../src/index.js';
import parser from '../src/parser.js';
import Assembler from '../src/assembler.js';
import disassembler from '../src/disassembler.js';
import Stringer from '../src/stringer.js';
import Emitter from '../src/emitter.js';

// --- index (make) ---

const mainStream: Duplex = make();
const mainStreamOpts: Duplex = make({packValues: true});
const p: typeof parser = make.parser;

// --- assembler ---

const asm = new Assembler();
const asmWithOpts = new Assembler({reviver: (k, v) => v, numberAsString: true});

// static connectTo
const asm2: Assembler = Assembler.connectTo(parser.asStream());

// instance properties
const stack: any[] = asm.stack;
const current: any = asm.current;
const key: string | null = asm.key;
const done: boolean = asm.done;
const depth: number = asm.depth;
const path: (string | number)[] = asm.path;

// instance methods
asm.dropToLevel(0);
asm.consume({name: 'startObject'});
asm.keyValue('test');
asm.stringValue('hello');
asm.numberValue('42');
asm.nullValue();
asm.trueValue();
asm.falseValue();
asm.startObject();
asm.endObject();
asm.startArray();
asm.endArray();

// tapChain
const tapResult: any = asm.tapChain({name: 'startObject'});

// factory
const asm3: Assembler = Assembler.assembler();

// AssemblerOptions
const asmOpts: Assembler.AssemblerOptions = {reviver: (k, v) => v};

// --- disassembler ---

const disasmFn = disassembler();
const disasmFnOpts = disassembler({packValues: true, replacer: (k, v) => v});
const disasmFnArr = disassembler({replacer: ['a', 'b']});

// returns a generator function
const gen: Generator<parser.Token, void, undefined> = disasmFn({a: 1});

// asStream
const disasmStream: Duplex = disassembler.asStream();
const disasmStreamOpts: Duplex = disassembler.asStream({streamValues: false});

// DisassemblerOptions
const disasmOpts: disassembler.DisassemblerOptions = {packStrings: true, streamKeys: false};

// --- stringer ---

const stringer: Stringer = Stringer.make();
const stringer2: Stringer = Stringer.make({useValues: true, makeArray: true});
const stringer3: Stringer = new Stringer({useKeyValues: false, useStringValues: true, useNumberValues: false});
const stringer4: Stringer = Stringer.stringer();

// StringerOptions
const strOpts: Stringer.StringerOptions = {useValues: true, makeArray: false};

// --- emitter ---

const emitter: Emitter = Emitter.make();
const emitter2: Emitter = new Emitter();
const emitter3: Emitter = Emitter.emitter();
