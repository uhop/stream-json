'use strict';

import fs from 'node:fs';
import zlib from 'node:zlib';

import test from 'tape-six';
import chain from 'stream-chain';

import makeParser, {parser} from '../src/index.js';
import Assembler, {assembler} from '../src/assembler.js';

import readString from './read-string.mjs';

test.asPromise('assembler: general', (t, resolve, reject) => {
  let object = null;
  const parser = makeParser(),
    asm = Assembler.connectTo(parser);

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);
    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString());

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(parser);
    });
  });
});

test.asPromise('assembler: no streaming', (t, resolve, reject) => {
  let object = null;
  const parser = makeParser({streamValues: false}),
    asm = Assembler.connectTo(parser);

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);

    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString());

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(parser);
    });
  });
});

test.asPromise('assembler: json stream primitives', (t, resolve, reject) => {
  const parser = makeParser({jsonStreaming: true}),
    asm = Assembler.connectTo(parser),
    pattern = [1, 2, 'zzz', 'z\'z"z', null, true, false, 1, [], null, {}, true, {a: 'b'}],
    result = [];

  asm.on('done', asm => result.push(asm.current));
  parser.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });
  parser.on('error', reject);

  readString(pattern.map(value => JSON.stringify(value)).join(' ')).pipe(parser);
});

test.asPromise('assembler: reviver', (t, resolve, reject) => {
  const reviver = (k, v) => {
    if (k === 'b' || k === '1') return;
    return v;
  };

  const source = [
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3}
    ],
    json = JSON.stringify(source),
    shouldBe = JSON.parse(json, reviver);

  const parser = makeParser({streamValues: false}),
    asm = Assembler.connectTo(parser, {reviver});

  parser.on('end', () => {
    t.deepEqual(asm.current, shouldBe);
    resolve();
  });
  parser.on('error', reject);

  readString(json).pipe(parser);
});

test.asPromise('assembler: no streaming with reviver', (t, resolve, reject) => {
  const reviver = (k, v) => {
    if (k.charAt(0) === '@' || /^data/.test(k)) return;
    return v;
  };

  let object = null;
  const parser = makeParser({streamValues: false}),
    asm = Assembler.connectTo(parser, {reviver});

  parser.on('end', () => {
    t.deepEqual(asm.current, object);
    resolve();
  });

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);

    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString(), reviver);

      fs.createReadStream(fileName).pipe(zlib.createGunzip()).pipe(parser);
    });
  });
});

test.asPromise('assembler: numberAsString', (t, resolve, reject) => {
  const source = [
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3},
      {a: 1, b: 2, c: 3}
    ],
    json = JSON.stringify(source),
    shouldBe = [
      {a: '1', b: '2', c: '3'},
      {a: '1', b: '2', c: '3'},
      {a: '1', b: '2', c: '3'}
    ];

  const parser = makeParser({streamValues: false}),
    asm = Assembler.connectTo(parser, {numberAsString: true});

  parser.on('end', () => {
    t.deepEqual(asm.current, shouldBe);
    resolve();
  });
  parser.on('error', reject);

  readString(json).pipe(parser);
});

test.asPromise('assembler: chain', (t, resolve, reject) => {
  let object = null;
  const asm = assembler();

  const fileName = new URL('./data/sample.json.gz', import.meta.url);

  fs.readFile(fileName, (err, data) => {
    if (err) return reject(err);
    zlib.gunzip(data, (err, data) => {
      if (err) return reject(err);

      object = JSON.parse(data.toString());

      const pipeline = chain([fs.createReadStream(fileName), zlib.createGunzip(), parser(), asm.tapChain]);
      pipeline.on('error', reject);
      pipeline.on('end', () => {
        t.deepEqual(asm.current, object);
        resolve();
      });
      pipeline.on('data', value => {
        t.deepEqual(value, object);
      });
    });
  });
});
