'use strict';

const unit = require('heya-unit');

const Verifier = require('../utils/Verifier');

const ReadString = require('./ReadString');

unit.add(module, [
  function test_verifier_good1(t) {
    const async = t.startAsync('test_verifier_good1');

    const input = '[1,2,3]',
      verifier = new Verifier(),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      t.test(!"We shouldn't be here!");
      async.done();
    });
    pipeline.on('finish', function() {
      async.done();
    });
  },
  function test_verifier_good2(t) {
    const async = t.startAsync('test_verifier_good2');

    const input = '[\n1,\n2,\n3\n]',
      verifier = new Verifier(),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      t.test(!"We shouldn't be here!");
      async.done();
    });
    pipeline.on('finish', function() {
      async.done();
    });
  },
  function test_verifier_good3(t) {
    const async = t.startAsync('test_verifier_good3');

    const input = '[\r\n1,\r\n2,\r\n3\r\n]',
      verifier = new Verifier(),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      t.test(!"We shouldn't be here!");
      async.done();
    });
    pipeline.on('finish', function() {
      async.done();
    });
  },
  function test_verifier_good4(t) {
    const async = t.startAsync('test_verifier_good4');

    const input = '1 2 3',
      verifier = new Verifier({jsonStreaming: true}),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      t.test(!"We shouldn't be here!");
      async.done();
    });
    pipeline.on('finish', function() {
      async.done();
    });
  },
  function test_verifier_bad1(t) {
    const async = t.startAsync('test_verifier_bad1');

    const input = '[1,2 3]',
      verifier = new Verifier(),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      eval(t.TEST('error.line === 1 && error.pos === 6 && error.offset === 5'));
      async.done();
    });
    pipeline.on('finish', function() {
      t.test(!"We shouldn't be here!");
      async.done();
    });
  },
  function test_verifier_bad2(t) {
    const async = t.startAsync('test_verifier_bad2');

    const input = '[\n1,\n2\n3\n]',
      verifier = new Verifier(),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      eval(t.TEST('error.line === 4 && error.pos === 1 && error.offset === 7'));
      async.done();
    });
    pipeline.on('finish', function() {
      t.test(!"We shouldn't be here!");
      async.done();
    });
  },
  function test_verifier_bad3(t) {
    const async = t.startAsync('test_verifier_bad3');

    const input = '[\r\n1,\r\n2\r\n3\r\n]',
      verifier = new Verifier(),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      eval(t.TEST('error.line === 4 && error.pos === 1 && error.offset === 10'));
      async.done();
    });
    pipeline.on('finish', function() {
      t.test(!"We shouldn't be here!");
      async.done();
    });
  },
  function test_verifier_bad4(t) {
    const async = t.startAsync('test_verifier_bad4');

    const input = '1 , 3',
      verifier = new Verifier({jsonStreaming: true}),
      pipeline = ReadString.make(input).pipe(verifier);

    pipeline.on('error', function(error) {
      eval(t.TEST('error.line === 1 && error.pos === 3 && error.offset === 2'));
      async.done();
    });
    pipeline.on('finish', function() {
      t.test(!"We shouldn't be here!");
      async.done();
    });
  }
]);
