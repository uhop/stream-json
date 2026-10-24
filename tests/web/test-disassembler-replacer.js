import test from 'tape-six';
import disassembler from '../../src/web/disassembler.js';
import stringer from '../../src/web/stringer.js';

const cases = [
  [
    'replacer own call property is not consulted',
    log => {
      const replacer = function (key, value) {
        log.push(key);
        return value;
      };
      Object.defineProperty(replacer, 'call', {
        get() {
          log.push('call getter');
          throw new Error('own call');
        }
      });
      return {input: {a: [1, {b: 2}]}, replacer};
    }
  ],
  [
    'root holder',
    () => ({
      input: {a: 1, b: 2},
      replacer: function (key, value) {
        return key === '' ? this[''] : key === 'a' ? this.b : value;
      }
    })
  ],
  [
    'primitive root holder',
    () => ({
      input: 0,
      replacer: function () {
        return this[''];
      }
    })
  ],
  [
    'nested holders and string keys',
    log => ({
      input: {a: [1, {b: 2}]},
      replacer: function (key, value) {
        log.push([key, typeof key, Array.isArray(this), Object.keys(this), this[key] === value]);
        return value;
      }
    })
  ],
  [
    'toJSON before replacer with original root holder',
    log => ({
      input: {
        toJSON(key) {
          log.push(['toJSON', key]);
          return {
            a: {
              toJSON(key) {
                log.push(['toJSON', key]);
                return 2;
              }
            }
          };
        }
      },
      replacer: function (key, value) {
        log.push(['replacer', key, typeof this[key]?.toJSON]);
        return value;
      }
    })
  ],
  [
    'updates, deletes and additions during traversal',
    () => ({
      input: {a: 1, b: 2, c: 3},
      replacer: function (key, value) {
        if (key === 'a') {
          this.b = 20;
          delete this.c;
          this.d = 40;
        }
        return value;
      }
    })
  ],
  [
    'inherited replacement after deleting an own property',
    () => ({
      input: Object.assign(Object.create({b: 8, inherited: 9}), {a: 1, b: 2}),
      replacer: function (key, value) {
        if (key === 'a') delete this.b;
        return value;
      }
    })
  ],
  [
    'getters read at each property visit',
    log => ({
      input: {
        a: 1,
        get b() {
          log.push('get b');
          return 2;
        }
      },
      replacer: function (key, value) {
        log.push(['replacer', key]);
        return value;
      }
    })
  ],
  [
    'array growth',
    () => ({
      input: [1, 2],
      replacer: function (key, value) {
        if (key === '0') this.push(3);
        return value;
      }
    })
  ],
  [
    'array shrinkage',
    () => ({
      input: [1, 2, 3],
      replacer: function (key, value) {
        if (key === '0') this.length = 1;
        return value;
      }
    })
  ],
  [
    'array holes and inherited indices',
    () => ({
      input: Object.setPrototypeOf([1, , 3], Object.assign(Object.create(Array.prototype), {1: 7})),
      replacer: function (key, value) {
        return key === '0' ? this[1] : value;
      }
    })
  ],
  [
    'array length read and coerced once',
    log => ({
      input: new Proxy([1, 2, 3], {
        get(target, key, receiver) {
          if (key === 'length') {
            log.push('length');
            return {
              valueOf() {
                log.push('coerce length');
                return 2.9;
              }
            };
          }
          return Reflect.get(target, key, receiver);
        }
      })
    })
  ],
  [
    'stop before later getters when replacer throws',
    log => ({
      input: {
        a: 1,
        get b() {
          log.push('get b');
          throw new Error('later getter');
        }
      },
      replacer: function (key, value) {
        if (key === 'a') throw new Error('replacer');
        return value;
      }
    })
  ],
  [
    'replacement values and skipped members',
    () => ({
      input: {a: 1, b: [2, 3, 4], c: 5},
      replacer: function (key, value) {
        if (key === 'a' || key === '1') return undefined;
        if (key === '0') return null;
        if (key === 'c') return {replacement: 6};
        return value;
      }
    })
  ],
  [
    'non-enumerable properties remain unread',
    () => ({
      input: Object.defineProperty({a: 1}, 'hidden', {
        get() {
          throw new Error('hidden');
        }
      }),
      replacer: function (_key, value) {
        return value;
      }
    })
  ]
];

const observe = (create, options, native) => {
  const log = [],
    {input, replacer} = create(log);
  try {
    let text;
    if (native) text = JSON.stringify(input, replacer);
    else {
      const encode = stringer({useValues: options.streamValues === false});
      text = '';
      for (const token of disassembler({...options, replacer})(input)) {
        const chunk = encode(token);
        if (typeof chunk === 'string') text += chunk;
      }
      if (!text) text = undefined;
    }
    return {text, log};
  } catch (error) {
    return {error: error.message, log};
  }
};

for (const [name, create] of cases) {
  test('disassembler replacer: ' + name, t => {
    for (const options of [{}, {streamValues: false}, {packValues: false}]) {
      t.deepEqual(observe(create, options, false), observe(create, options, true));
    }
  });
}
