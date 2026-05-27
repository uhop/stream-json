// Isolated dispatch micro-benchmarks (pure JS, no deps).
//   npx nano-bench bench/parser-research/dispatch-bench.js -e dispatch
//   npx nano-bench bench/parser-research/dispatch-bench.js -e classify
//
// Caveat: this isolates dispatch/classification cost. In the real parser there
// is regex + string + allocation work BETWEEN dispatches, so dispatch's share
// of total time is smaller than these ratios suggest. The point is the RELATIVE
// cost of the mechanisms, and whether V8 jump-tables an int switch.

// ---------- state set (mirrors parser.js switch groups, original order) ----------
// 0 value1/value | 1 keyVal/string | 2 key1/key | 3 colon | 4 arrayStop/objectStop
// 5 numberStart | 6 numberDigit | 7 numberFraction | 8 numberFracStart
// 9 numberFracDigit | 10 numberExponent | 11 numberExpSign | 12 numberExpStart
// 13 numberExpDigit | 14 done
const NAMES = [
  'value', 'string', 'key', 'colon', 'objectStop',
  'numberStart', 'numberDigit', 'numberFraction', 'numberFracStart', 'numberFracDigit',
  'numberExponent', 'numberExpSign', 'numberExpStart', 'numberExpDigit', 'done'
];

// Build a realistic ORDERED state-visit sequence by simulating parsing objects:
// {"key":<value>, ...} with a mix of string / number / bool values.
const visitsInt = [];
const push = id => visitsInt.push(id);
const OBJECTS = 4000, KEYS = 8;
for (let o = 0; o < OBJECTS; ++o) {
  push(0); // value sees '{'
  for (let k = 0; k < KEYS; ++k) {
    push(2);            // key1 sees '"'
    push(1);            // string (key body run)
    push(1);            // string sees closing '"'
    push(3);            // colon
    push(0);            // value sees value-start
    const kind = (o * KEYS + k) % 5;
    if (kind < 2) {     // string value (40%)
      push(1); push(1); // body run + close
    } else if (kind < 4) { // number value (40%)
      push(6);          // numberDigit
      push(7);          // numberFraction (no match -> parent)
      if ((o + k) & 1) { push(8); push(9); } // sometimes a fraction
    } // else bool/null (20%): consumed in value, no extra states
    push(4);            // objectStop (',' or '}')
  }
}
push(14); // done
const visitsStr = visitsInt.map(i => NAMES[i]);
const N = visitsInt.length;

let sink = 0;

// 1) switch on string, ORIGINAL parser order
const passSwitchStr = () => {
  let acc = 0;
  for (let i = 0; i < N; ++i) {
    switch (visitsStr[i]) {
      case 'value': acc += 0; break;
      case 'string': acc += 1; break;
      case 'key': acc += 2; break;
      case 'colon': acc += 3; break;
      case 'objectStop': acc += 4; break;
      case 'numberStart': acc += 5; break;
      case 'numberDigit': acc += 6; break;
      case 'numberFraction': acc += 7; break;
      case 'numberFracStart': acc += 8; break;
      case 'numberFracDigit': acc += 9; break;
      case 'numberExponent': acc += 10; break;
      case 'numberExpSign': acc += 11; break;
      case 'numberExpStart': acc += 12; break;
      case 'numberExpDigit': acc += 13; break;
      case 'done': acc += 14; break;
    }
  }
  return acc;
};

// 2) switch on string, HOT cases first (string,value,colon,key,objectStop,numberDigit)
const passSwitchStrHot = () => {
  let acc = 0;
  for (let i = 0; i < N; ++i) {
    switch (visitsStr[i]) {
      case 'string': acc += 1; break;
      case 'value': acc += 0; break;
      case 'colon': acc += 3; break;
      case 'key': acc += 2; break;
      case 'objectStop': acc += 4; break;
      case 'numberDigit': acc += 6; break;
      case 'numberFraction': acc += 7; break;
      case 'numberFracStart': acc += 8; break;
      case 'numberFracDigit': acc += 9; break;
      case 'numberStart': acc += 5; break;
      case 'numberExponent': acc += 10; break;
      case 'numberExpSign': acc += 11; break;
      case 'numberExpStart': acc += 12; break;
      case 'numberExpDigit': acc += 13; break;
      case 'done': acc += 14; break;
    }
  }
  return acc;
};

// 3) switch on int (dense -> V8 jump table)
const passSwitchInt = () => {
  let acc = 0;
  for (let i = 0; i < N; ++i) {
    switch (visitsInt[i]) {
      case 0: acc += 0; break;
      case 1: acc += 1; break;
      case 2: acc += 2; break;
      case 3: acc += 3; break;
      case 4: acc += 4; break;
      case 5: acc += 5; break;
      case 6: acc += 6; break;
      case 7: acc += 7; break;
      case 8: acc += 8; break;
      case 9: acc += 9; break;
      case 10: acc += 10; break;
      case 11: acc += 11; break;
      case 12: acc += 12; break;
      case 13: acc += 13; break;
      case 14: acc += 14; break;
    }
  }
  return acc;
};

// 4) array of functions indexed by int state (polymorphic call site)
const fns = NAMES.map((_, id) => () => id);
const passArrayFns = () => {
  let acc = 0;
  for (let i = 0; i < N; ++i) acc += fns[visitsInt[i]]();
  return acc;
};

export const dispatch = {
  'switch-str'(n) { for (let i = 0; i < n; ++i) sink += passSwitchStr(); },
  'switch-str-hot'(n) { for (let i = 0; i < n; ++i) sink += passSwitchStrHot(); },
  'switch-int'(n) { for (let i = 0; i < n; ++i) sink += passSwitchInt(); },
  'array-fns'(n) { for (let i = 0; i < n; ++i) sink += passArrayFns(); }
};

// ===================== classify experiment (avenue #4) =====================
// Build a buffer of value-starts + their indices; classify each into a branch id.
const valueStartRe = /[\"\{\[\]\-\d]|true\b|false\b|null\b|\s{1,256}/y;
const valueStartGroups = /([\"\{\[\]\-\d])|(true\b)|(false\b)|(null\b)|(\s{1,256})/y;

const toks = [];
for (let i = 0; i < 20000; ++i) {
  const r = i % 100;
  if (r < 50) toks.push('"');
  else if (r < 80) toks.push('7');
  else if (r < 87) toks.push('{');
  else if (r < 92) toks.push('[');
  else if (r < 95) toks.push('-');
  else if (r < 97) toks.push('true ');
  else if (r < 99) toks.push('false ');
  else toks.push('null ');
}
const buf = toks.join('');
const idx = [];
{
  let p = 0;
  for (const t of toks) { idx.push(p); p += t.length; }
}
const M = idx.length;

// branch ids: 0 string 1 number 2 obj 3 arr 4 neg 5 true 6 false 7 null
const classifyPlain = () => {
  let acc = 0;
  for (let i = 0; i < M; ++i) {
    valueStartRe.lastIndex = idx[i];
    const m = valueStartRe.exec(buf);
    const v = m[0];
    if (v === '"') acc += 0;
    else if (v === '{') acc += 2;
    else if (v === '[') acc += 3;
    else if (v === '-') acc += 4;
    else if (v === 'true') acc += 5;
    else if (v === 'false') acc += 6;
    else if (v === 'null') acc += 7;
    else acc += 1; // digit (whitespace excluded from data)
  }
  return acc;
};

const classifyGroups = () => {
  let acc = 0;
  for (let i = 0; i < M; ++i) {
    valueStartGroups.lastIndex = idx[i];
    const m = valueStartGroups.exec(buf);
    // linear scan for the fired group (the user's pain point)
    if (m[1] !== undefined) {
      const c = m[1];
      if (c === '"') acc += 0;
      else if (c === '{') acc += 2;
      else if (c === '[') acc += 3;
      else if (c === '-') acc += 4;
      else acc += 1;
    } else if (m[2] !== undefined) acc += 5;
    else if (m[3] !== undefined) acc += 6;
    else if (m[4] !== undefined) acc += 7;
    else acc += 99; // ws
  }
  return acc;
};

const classifyCharCode = () => {
  let acc = 0;
  for (let i = 0; i < M; ++i) {
    const c = buf.charCodeAt(idx[i]);
    switch (c) {
      case 34: acc += 0; break;        // "
      case 123: acc += 2; break;       // {
      case 91: acc += 3; break;        // [
      case 45: acc += 4; break;        // -
      case 116: acc += 5; break;       // t
      case 102: acc += 6; break;       // f
      case 110: acc += 7; break;       // n
      default: acc += 1;               // digit
    }
  }
  return acc;
};

export const classify = {
  'regex-plain'(n) { for (let i = 0; i < n; ++i) sink += classifyPlain(); },
  'regex-groups'(n) { for (let i = 0; i < n; ++i) sink += classifyGroups(); },
  'charcode'(n) { for (let i = 0; i < n; ++i) sink += classifyCharCode(); }
};

// sanity: all dispatch strategies and all classify strategies agree
export const _check = {
  dispatch: [passSwitchStr(), passSwitchStrHot(), passSwitchInt(), passArrayFns()],
  classify: [classifyPlain(), classifyCharCode()] // groups differs (ws=99) only if ws present; none here
};
export {sink};
