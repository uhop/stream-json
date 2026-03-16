import {Duplex, Transform, Writable} from 'node:stream';

import parser from '../src/parser.js';
import emit from '../src/utils/emit.js';
import withParser from '../src/utils/with-parser.js';
import Batch from '../src/utils/batch.js';
import Verifier from '../src/utils/verifier.js';
import Utf8Stream from '../src/utils/utf8-stream.js';

// --- emit ---

const stream = parser.asStream();
const emitted: typeof stream = emit(stream);

// --- withParser ---

const wp = withParser((opts?: any) => () => {}, {packKeys: true});
const wpStream: Duplex = withParser.asStream((opts?: any) => () => {}, {packValues: true});

// --- Batch ---

const batch: Batch = Batch.make();
const batch2: Batch = Batch.make({batchSize: 10});
const batch3: Batch = new Batch({batchSize: 5});
const batch4: Batch = Batch.batch({batchSize: 100});
const batchSize: number = batch._batchSize;

// BatchOptions
const batchOpts: Batch.BatchOptions = {batchSize: 50};

// --- Verifier ---

const verifier: Verifier = Verifier.make();
const verifier2: Verifier = Verifier.make({jsonStreaming: true});
const verifier3: Verifier = new Verifier();
const verifier4: Verifier = Verifier.verifier();

// VerifierOptions
const vOpts: Verifier.VerifierOptions = {jsonStreaming: false};

// VerifierError
const vErr: Verifier.VerifierError = Object.assign(new Error('test'), {line: 1, pos: 5, offset: 4});

// --- Utf8Stream ---

const utf8: Utf8Stream = new Utf8Stream();
const utf8Opts: Utf8Stream = new Utf8Stream({highWaterMark: 1024});
