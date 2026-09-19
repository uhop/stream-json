// @ts-self-types="./path-matcher.d.ts"

const DIVERGED = -1,
  MATCHED = -2;

const defaultFilter = () => true;

// Array.prototype.join semantics
const toPart = key => (key == null ? '' : '' + key);

class PathMatcher {
  constructor(filter, separator = '.') {
    this.filter = filter;
    this.separator = separator;
    this.stateful = true;
    if (typeof filter == 'string') {
      this.filterWithSeparator = filter + separator;
      this.states = [0];
      return;
    }
    if (filter instanceof RegExp) {
      this.paths = [''];
      this.extend = this._extendRegExp;
      this.test = this._testRegExp;
      this.testRecorded = this._testRecordedRegExp;
      return;
    }
    this.stateful = false;
    this.extend = this._extendNothing;
    this.test = this.testRecorded = typeof filter == 'function' ? filter : defaultFilter;
  }

  extend(stack) {
    const length = stack.length;
    if (length) this.states[length] = this._step(this.states[length - 1], stack[length - 1], length === 1);
  }

  test(stack, _chunk) {
    const length = stack.length;
    return this._isMatch(length ? this._step(this.states[length - 1], stack[length - 1], length === 1) : 0);
  }

  testRecorded(stack) {
    return this._isMatch(this.states[stack.length]);
  }

  _isMatch(state) {
    return state === MATCHED || state === this.filter.length;
  }

  // state: a position when the path is a proper prefix of filter + separator
  _step(state, key, isRoot) {
    if (!isRoot) state = this._append(state, this.separator);
    return this._append(state, toPart(key));
  }

  _append(state, part) {
    if (state < 0) return state;
    const filterWithSeparator = this.filterWithSeparator;
    if (part.length < filterWithSeparator.length - state) return filterWithSeparator.startsWith(part, state) ? state + part.length : DIVERGED;
    return part.startsWith(filterWithSeparator.slice(state)) ? MATCHED : DIVERGED;
  }

  _extendRegExp(stack) {
    const length = stack.length;
    // kept flat: a test against a concatenated parent costs ~34x more at depth 1000 (nano-bench)
    if (length) this.paths[length] = length === 1 ? toPart(stack[0]) : [this.paths[length - 1], this.separator, toPart(stack[length - 1])].join('');
  }

  _testRegExp(stack, _chunk) {
    const length = stack.length,
      filter = this.filter;
    filter.lastIndex = 0;
    if (!length) return filter.test('');
    return filter.test(length === 1 ? toPart(stack[0]) : this.paths[length - 1] + this.separator + toPart(stack[length - 1]));
  }

  _testRecordedRegExp(stack) {
    const filter = this.filter;
    filter.lastIndex = 0;
    return filter.test(this.paths[stack.length]);
  }

  _extendNothing(_stack) {}
}

export default PathMatcher;
export {PathMatcher};
