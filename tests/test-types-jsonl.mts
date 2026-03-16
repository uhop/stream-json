import {Transform} from 'node:stream';

import JsonlParser from '../src/jsonl/parser.js';
import JsonlStringer from '../src/jsonl/stringer.js';
import Utf8Stream from '../src/utils/utf8-stream.js';

// --- JsonlParser ---

const jp: JsonlParser = JsonlParser.make();
const jp2: JsonlParser = JsonlParser.make({reviver: (k, v) => v, checkErrors: true});
const jp3: JsonlParser = JsonlParser.parser();
const jp4: JsonlParser = new JsonlParser({errorIndicator: null});

// extends Utf8Stream
const isTransform: Transform = jp;

// static method
const parsed: any = JsonlParser.checkedParse('{"a":1}');
const parsedWithReviver: any = JsonlParser.checkedParse('1', (k, v) => v, undefined);

// JsonlParserOptions
const jpOpts: JsonlParser.JsonlParserOptions = {
  reviver: (k, v) => v,
  errorIndicator: null,
  checkErrors: true
};

// JsonlItem
const item: JsonlParser.JsonlItem = {key: 0, value: {a: 1}};

// --- JsonlStringer ---

const js: JsonlStringer = JsonlStringer.make();
const js2: JsonlStringer = JsonlStringer.make({separator: '\r\n', replacer: (k, v) => v});
const js3: JsonlStringer = JsonlStringer.stringer();
const js4: JsonlStringer = new JsonlStringer({separator: '\n'});

// extends Transform
const isTransform2: Transform = js;

// JsonlStringerOptions
const jsOpts: JsonlStringer.JsonlStringerOptions = {
  replacer: (k, v) => v,
  separator: '\n'
};
