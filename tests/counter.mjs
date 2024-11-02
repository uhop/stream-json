'use strict';

export class Counter {
  constructor() {
    this.objects = this.keys = this.arrays = this.nulls = this.trues = this.falses = this.numbers = this.strings = 0;
  }
  static walk(o, counter) {
    switch (typeof o) {
      case 'string':
        ++counter.strings;
        return;
      case 'number':
        ++counter.numbers;
        return;
      case 'boolean':
        if (o) {
          ++counter.trues;
        } else {
          ++counter.falses;
        }
        return;
    }
    if (o === null) {
      ++counter.nulls;
      return;
    }
    if (o instanceof Array) {
      ++counter.arrays;
      o.forEach(function (o) {
        Counter.walk(o, counter);
      });
      return;
    }
    ++counter.objects;
    for (let key in o) {
      if (o.hasOwnProperty(key)) {
        ++counter.keys;
        Counter.walk(o[key], counter);
      }
    }
  }
}

export default Counter;
