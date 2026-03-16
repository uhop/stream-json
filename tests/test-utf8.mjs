import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import Assembler from '../src/assembler.js';
import Utf8Stream from '../src/utils/utf8-stream.js';
import Verifier from '../src/utils/verifier.js';
import JsonlParser from '../src/jsonl/parser.js';

import readString from './read-string.mjs';

const pattern = {
  german: 'Das Mädchen ist dünn und schön. Löwen, Bären, Vögel und Käfer sind Tiere. Prüfungen sind blöd.',
  russian: 'Я люблю программирование.',
  chineseSimplified: '可以见到《海螺小姐》啦！ 长谷川町子纪念馆已开馆',
  chineseTraditional: '來東京與「海螺小姐」相見歡 長谷川町子紀念館開幕',
  japanese: 'ウイルスの実態と合わない対策　過剰な恐怖広げた専門家'
};

test.asPromise('utf8: Utf8Stream + parser byte-by-byte', (t, resolve, reject) => {
  const input = Buffer.from(JSON.stringify(pattern)),
    pipeline = chain([readString(input, 1), new Utf8Stream(), parser.asStream()]),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, pattern);
    resolve();
  });
});

test.asPromise('utf8: parser handles multi-byte directly', (t, resolve, reject) => {
  const input = Buffer.from(JSON.stringify(pattern)),
    pipeline = readString(input, 1).pipe(parser.asStream()),
    assembler = Assembler.connectTo(pipeline);

  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(assembler.current, pattern);
    resolve();
  });
});

test.asPromise('utf8: verifier with multi-byte', (t, resolve, reject) => {
  const input = Buffer.from(JSON.stringify(pattern)),
    pipeline = readString(input, 1).pipe(Verifier.asStream());

  pipeline.on('error', reject);
  pipeline.on('finish', resolve);
});

test.asPromise('utf8: jsonl parser with multi-byte', (t, resolve, reject) => {
  const input = Buffer.from(
      Object.keys(pattern)
        .map(key => JSON.stringify({key, value: pattern[key]}))
        .join('\n')
    ),
    pipeline = readString(input, 1).pipe(JsonlParser.asStream()),
    result = {};

  pipeline.on('data', item => {
    result[item.value.key] = item.value.value;
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, pattern);
    resolve();
  });
});
