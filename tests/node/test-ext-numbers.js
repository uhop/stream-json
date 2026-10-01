import test from 'tape-six';

import {ExactNumber, toBigIntOrNumber, toExactOrNumber, numberConverter} from '../../src/utils/ext-numbers.js';

test('ExactNumber: canonical toString', t => {
  const cases = {
    '1e2': '100',
    '0.10': '0.1',
    '1.5e-3': '0.0015',
    '-0': '0',
    '-0.0': '0',
    '0e5': '0',
    '100.00': '100',
    '1.23e5': '123000',
    '00012': '12',
    '0.000': '0',
    '-1.50': '-1.5',
    '5E-1': '0.5',
    '2e+3': '2000',
    '123456789012345678901234567890': '123456789012345678901234567890',
    '0.1234567890123456789': '0.1234567890123456789',
    '-123456789012345678901234567890.5': '-123456789012345678901234567890.5'
  };
  for (const [text, expected] of Object.entries(cases)) {
    t.equal(new ExactNumber(text).toString(), expected, text);
  }
});

test('ExactNumber: valueOf returns the nearest double', t => {
  t.equal(new ExactNumber('0.5').valueOf(), 0.5);
  t.equal(new ExactNumber('0.1234567890123456789').valueOf(), 0.12345678901234568);
  t.equal(new ExactNumber('-1e3').valueOf(), -1000);
  t.equal(new ExactNumber('1e400').valueOf(), Infinity);
  t.equal(+new ExactNumber('12.5'), 12.5);
});

test('ExactNumber: isInteger', t => {
  t.ok(new ExactNumber('42').isInteger);
  t.ok(new ExactNumber('100.00').isInteger);
  t.ok(new ExactNumber('1e16').isInteger);
  t.ok(new ExactNumber('0').isInteger);
  t.notOk(new ExactNumber('1.5').isInteger);
  t.notOk(new ExactNumber('1e-2').isInteger);
});

test('ExactNumber: toBigInt', t => {
  t.equal(new ExactNumber('1e16').toBigInt(), 10000000000000000n);
  t.equal(new ExactNumber('-123456789012345678901234567890').toBigInt(), -123456789012345678901234567890n);
  t.equal(new ExactNumber('100.00').toBigInt(), 100n);
  t.equal(new ExactNumber('-0').toBigInt(), 0n);
  t.throws(() => new ExactNumber('1.5').toBigInt(), RangeError);
});

test('toBigIntOrNumber: depends on the value, not the spelling', t => {
  t.equal(toBigIntOrNumber('9007199254740991'), 9007199254740991);
  t.equal(toBigIntOrNumber('9007199254740992'), 9007199254740992n);
  t.equal(toBigIntOrNumber('-9007199254740991'), -9007199254740991);
  t.equal(toBigIntOrNumber('-9007199254740992'), -9007199254740992n);
  t.equal(toBigIntOrNumber('1e16'), 10000000000000000n);
  t.equal(toBigIntOrNumber('100000000000000000.0'), 100000000000000000n);
  t.equal(toBigIntOrNumber('1.5'), 1.5);
  t.equal(toBigIntOrNumber('12345678901234567890.5'), 12345678901234567000);
  t.equal(toBigIntOrNumber('1e-5'), 0.00001);
  t.equal(toBigIntOrNumber('0'), 0);
  t.ok(Number.isNaN(toBigIntOrNumber('NaN')));
  t.equal(toBigIntOrNumber('-Infinity'), -Infinity);
});

test('toExactOrNumber: the extended words stay numbers', t => {
  t.ok(toExactOrNumber('1.5') instanceof ExactNumber);
  t.ok(Number.isNaN(toExactOrNumber('NaN')));
  t.equal(toExactOrNumber('Infinity'), Infinity);
  t.equal(toExactOrNumber('-Infinity'), -Infinity);
});

test('numberConverter: picks a converter by mode', t => {
  t.equal(numberConverter('bigint'), toBigIntOrNumber);
  t.equal(numberConverter('exact'), toExactOrNumber);
  t.equal(numberConverter('double'), null);
  t.equal(numberConverter(undefined), null);
});
