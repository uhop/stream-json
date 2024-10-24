'use strict';

const unit = require('heya-unit');

const Utf8Stream = require('../utils/Utf8Stream');
const Parser = require('../Parser');
const Verifier = require('../utils/Verifier');
const JsonlParser = require('../jsonl/Parser');
const Assembler = require('../Assembler');
const ReadString = require('./ReadString');

const pattern = {
  german: 'Das Mädchen ist dünn und schön. Löwen, Bären, Vögel und Käfer sind Tiere. Prüfungen sind blöd.',
  russian: 'Я люблю программирование.',
  chineseSimplified: '可以见到《海螺小姐》啦！ 长谷川町子纪念馆已开馆',
  chineseTraditional: '來東京與「海螺小姐」相見歡 長谷川町子紀念館開幕',
  japanese: 'ウイルスの実態と合わない対策　過剰な恐怖広げた専門家'
};

unit.add(module, [
  function test_utf8(t) {
    const async = t.startAsync('test_utf8');

    const input = Buffer.from(JSON.stringify(pattern)),
      pipeline = new ReadString(input, 1).pipe(new Utf8Stream()).pipe(new Parser()),
      assembler = Assembler.connectTo(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(assembler.current, pattern)'));
      async.done();
    });
  },
  function test_utf8_parser(t) {
    const async = t.startAsync('test_utf8_parser');

    const input = Buffer.from(JSON.stringify(pattern)),
      pipeline = new ReadString(input, 1).pipe(new Parser()),
      assembler = Assembler.connectTo(pipeline);

    pipeline.on('end', () => {
      eval(t.TEST('t.unify(assembler.current, pattern)'));
      async.done();
    });
  },
  function test_utf8_verifier(t) {
    const async = t.startAsync('test_utf8_verifier');

    const input = Buffer.from(JSON.stringify(pattern)),
      pipeline = new ReadString(input, 1).pipe(new Verifier());

    pipeline.on('finish', () => {
      t.test('Everything is fine');
      async.done();
    });
  },
  function test_utf8_jsonl_parser(t) {
    const async = t.startAsync('test_utf8_jsonl_parser');

    const input = Buffer.from(
        Object.keys(pattern)
          .map(key => JSON.stringify({key, value: pattern[key]}))
          .join('\n')
      ),
      pipeline = new ReadString(input, 1).pipe(new JsonlParser()),
      result = {};

    pipeline.on('data', item => {
      result[item.value.key] = item.value.value;
    });
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, pattern)'));
      async.done();
    });
  }
]);
