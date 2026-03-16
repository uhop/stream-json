import {Duplex} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';

import parser from '../src/parser.js';
import filterBase from '../src/filters/filter-base.js';
import pick from '../src/filters/pick.js';
import ignore from '../src/filters/ignore.js';
import replace from '../src/filters/replace.js';
import filter from '../src/filters/filter.js';

// --- filterBase ---

const fb = filterBase();
const fbWithConfig = filterBase({
  specialAction: 'accept',
  defaultAction: 'ignore',
  nonCheckableAction: 'process-key',
  transition(stack, chunk, action, options) {
    return undefined;
  }
});

// FilterBaseOptions
const fbOpts: filterBase.FilterBaseOptions = {
  filter: /^a/,
  once: true,
  pathSeparator: '.',
  streamValues: false,
  streamKeys: true,
  packKeys: true
};

// function filter
const fbFnFilter: filterBase.FilterBaseOptions = {filter: stack => stack.length > 1};
// string filter
const fbStrFilter: filterBase.FilterBaseOptions = {filter: 'a.b'};

// makeStackDiffer
const differ = filterBase.makeStackDiffer();
const differWithStack = filterBase.makeStackDiffer(['a', 0]);

// --- pick ---

const pickFn = pick({filter: 'a'});
const pickStream: Duplex = pick.withParserAsStream({filter: /^key/});
const pickWithParser = pick.withParser({filter: 'data', packKeys: true});

// --- ignore ---

const ignoreFn = ignore({filter: 'a.b'});
const ignoreStream: Duplex = ignore.withParserAsStream({filter: stack => true});
const ignoreWithParser = ignore.withParser({filter: 'temp', once: true});

// --- replace ---

const replaceFn = replace({filter: 'a', replacement: () => none});
const replaceWithTokens = replace({
  filter: 'old',
  replacement: [{name: 'nullValue', value: null}]
});
const replaceStream: Duplex = replace.withParserAsStream({filter: 'x'});

// ReplaceOptions
const replOpts: replace.ReplaceOptions = {
  filter: 'key',
  replacement: (stack, chunk, options) => ({name: 'nullValue', value: null})
};

// --- filter ---

const filterFn = filter({filter: 'a'});
const filterAccept = filter({filter: 'a', acceptObjects: true});
const filterStream: Duplex = filter.withParserAsStream({filter: /^data/});

// FilterOptions
const filtOpts: filter.FilterOptions = {acceptObjects: true, filter: 'x'};
