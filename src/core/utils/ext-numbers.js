const MAX_SAFE = 9007199254740991n;

const ZERO = 48,
  NINE = 57,
  MINUS = 45,
  PLUS = 43,
  DOT = 46,
  LOWER_E = 101,
  UPPER_E = 69;

const split = str => {
  let i = 0,
    neg = false;
  if (str.charCodeAt(0) === MINUS) {
    neg = true;
    i = 1;
  } else if (str.charCodeAt(0) === PLUS) {
    i = 1;
  }
  let intPart = '',
    fracPart = '',
    expDigits = '',
    expSign = '';
  while (i < str.length) {
    const cc = str.charCodeAt(i);
    if (cc < ZERO || cc > NINE) break;
    intPart += str[i++];
  }
  if (i < str.length && str.charCodeAt(i) === DOT) {
    ++i;
    while (i < str.length) {
      const cc = str.charCodeAt(i);
      if (cc < ZERO || cc > NINE) break;
      fracPart += str[i++];
    }
  }
  if (i < str.length && (str.charCodeAt(i) === LOWER_E || str.charCodeAt(i) === UPPER_E)) {
    ++i;
    if (i < str.length && (str.charCodeAt(i) === MINUS || str.charCodeAt(i) === PLUS)) {
      if (str.charCodeAt(i) === MINUS) expSign = '-';
      ++i;
    }
    while (i < str.length) {
      const cc = str.charCodeAt(i);
      if (cc < ZERO || cc > NINE) break;
      expDigits += str[i++];
    }
  }
  return {neg, intPart, fracPart, exp: expDigits ? Number(expSign + expDigits) : 0};
};

const integerValue = str => {
  const {neg, intPart, fracPart, exp} = split(str);
  if (!intPart && !fracPart) return null;

  let digits = intPart + fracPart;
  const shift = exp - fracPart.length;
  if (shift >= 0) {
    digits += '0'.repeat(shift);
  } else {
    const drop = -shift;
    if (drop > digits.length) return null;
    for (let k = digits.length - drop; k < digits.length; ++k) {
      if (digits.charCodeAt(k) !== ZERO) return null;
    }
    digits = digits.slice(0, digits.length - drop);
  }
  if (!digits) digits = '0';
  return BigInt((neg ? '-' : '') + digits);
};

const toBigIntOrNumber = str => {
  const i = integerValue(str);
  if (i !== null && (i > MAX_SAFE || i < -MAX_SAFE)) return i;
  return parseFloat(str);
};

class ExactNumber {
  #value;

  constructor(text) {
    const {neg, intPart, fracPart, exp} = split(String(text));
    let digits = intPart + fracPart;
    let e = exp - fracPart.length;
    let start = 0;
    while (start < digits.length - 1 && digits.charCodeAt(start) === ZERO) ++start;
    digits = digits.slice(start);
    let end = digits.length;
    while (end > 1 && digits.charCodeAt(end - 1) === ZERO) {
      end -= 1;
      e += 1;
    }
    digits = digits.slice(0, end) || '0';
    this.#value = digits === '0' ? {neg: false, digits: '0', exp: 0} : {neg, digits, exp: e};
  }

  get isInteger() {
    return this.#value.exp >= 0;
  }

  toString() {
    const {neg, digits, exp} = this.#value;
    if (digits === '0') return '0';
    let body;
    if (exp >= 0) {
      body = digits + '0'.repeat(exp);
    } else {
      const k = -exp;
      if (digits.length <= k) {
        body = '0.' + '0'.repeat(k - digits.length) + digits;
      } else {
        body = digits.slice(0, digits.length - k) + '.' + digits.slice(digits.length - k);
      }
    }
    return neg ? '-' + body : body;
  }

  valueOf() {
    return Number(this.toString());
  }

  toBigInt() {
    const {neg, digits, exp} = this.#value;
    if (exp < 0) throw new RangeError('ExactNumber is not an integer');
    return BigInt((neg ? '-' : '') + digits + '0'.repeat(exp));
  }
}

const toExactOrNumber = str => (str === 'NaN' || str === 'Infinity' || str === '-Infinity' ? parseFloat(str) : new ExactNumber(str));

const numberConverter = mode => (mode === 'bigint' ? toBigIntOrNumber : mode === 'exact' ? toExactOrNumber : null);

export {toBigIntOrNumber, toExactOrNumber, numberConverter, ExactNumber};
