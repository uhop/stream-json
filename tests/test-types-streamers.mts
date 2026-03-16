import {Duplex} from 'node:stream';
import {none} from 'stream-chain/defs.js';

import parser from '../src/parser.js';
import Assembler from '../src/assembler.js';
import streamBase from '../src/streamers/stream-base.js';
import streamArray from '../src/streamers/stream-array.js';
import streamObject from '../src/streamers/stream-object.js';
import streamValues from '../src/streamers/stream-values.js';

// --- streamBase ---

const sbOpts: streamBase.StreamBaseOptions = {
  reviver: (k, v) => v,
  numberAsString: true,
  objectFilter: (asm: Assembler) => true,
  includeUndecided: false
};

// --- streamArray ---

const saFn = streamArray();
const saFnOpts = streamArray({objectFilter: () => true});

// StreamArrayItem
const saItem: streamArray.StreamArrayItem = {key: 0, value: 'hello'};

// withParser / withParserAsStream
const saWithParser = streamArray.withParser();
const saStream: Duplex = streamArray.withParserAsStream({objectFilter: () => null});

// --- streamObject ---

const soFn = streamObject();
const soFnOpts = streamObject({includeUndecided: true});

// StreamObjectItem
const soItem: streamObject.StreamObjectItem = {key: 'name', value: 42};

// withParser / withParserAsStream
const soWithParser = streamObject.withParser();
const soStream: Duplex = streamObject.withParserAsStream();

// --- streamValues ---

const svFn = streamValues();
const svFnOpts = streamValues({numberAsString: true});

// StreamValuesItem
const svItem: streamValues.StreamValuesItem = {key: 0, value: {nested: true}};

// withParser / withParserAsStream
const svWithParser = streamValues.withParser();
const svStream: Duplex = streamValues.withParserAsStream();
