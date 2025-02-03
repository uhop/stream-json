// @ts-self-types="./filter-base.d.ts"

'use strict';

const {many, isMany, getManyValues, combineManyMut, none, flushable} = require('stream-chain');

const checkableTokens = {
    startObject: 1,
    startArray: 1,
    startString: 1,
    startNumber: 1,
    nullValue: 1,
    trueValue: 1,
    falseValue: 1,
    stringValue: 1,
    numberValue: 1
  },
  stopTokens = {
    startObject: 'endObject',
    startArray: 'endArray',
    startString: 'endString',
    startNumber: 'endNumber'
  },
  optionalTokens = {endString: 'stringValue', endNumber: 'numberValue'};

const defaultFilter = () => true;

const stringFilter = (string, separator) => {
  const stringWithSeparator = string + separator;
  return stack => {
    const path = stack.join(separator);
    return path === string || path.startsWith(stringWithSeparator);
  };
};

const regExpFilter = (regExp, separator) => {
  return stack => regExp.test(stack.join(separator));
};

const filterBase =
  ({specialAction = 'accept', defaultAction = 'ignore', nonCheckableAction = 'process-key', transition} = {}) =>
  options => {
    const once = options?.once,
      separator = options?.pathSeparator || '.';
    let filter = defaultFilter,
      streamKeys = true;
    if (options) {
      if (typeof options.filter == 'function') {
        filter = options.filter;
      } else if (typeof options.filter == 'string') {
        filter = stringFilter(options.filter, separator);
      } else if (options.filter instanceof RegExp) {
        filter = regExpFilter(options.filter, separator);
      }
      if ('streamValues' in options) streamKeys = options.streamValues;
      if ('streamKeys' in options) streamKeys = options.streamKeys;
    }
    const sanitizedOptions = Object.assign({}, options, {filter, streamKeys, separator});
    let state = 'check',
      stack = [],
      depth = 0,
      previousToken = '',
      endToken = '',
      optionalToken = '',
      startTransition = false;
    return flushable(chunk => {
      // the flush
      if (chunk === none) return transition ? transition([], null, 'flush', sanitizedOptions) : none;

      // process the optional value token (unfinished)
      if (optionalToken) {
        if (optionalToken === chunk.name) {
          let returnToken = none;
          switch (state) {
            case 'process-key':
              stack[stack.length - 1] = chunk.value;
              state = 'check';
              break;
            case 'accept-value':
              returnToken = chunk;
              state = once ? 'pass' : 'check';
              break;
            default:
              state = once ? 'all' : 'check';
              break;
          }
          optionalToken = '';
          return returnToken;
        }
        optionalToken = '';
        state = once && state !== 'process-key' ? 'pass' : 'check';
      }

      let returnToken = none;

      recheck: for (;;) {
        // accept/reject tokens
        switch (state) {
          case 'process-key':
            if (chunk.name === 'endKey') optionalToken = 'keyValue';
            return none;
          case 'pass':
            return none;
          case 'all':
            return chunk;
          case 'accept':
          case 'reject':
            if (startTransition) {
              startTransition = false;
              returnToken = transition(stack, chunk, state, sanitizedOptions) || none;
            }
            switch (chunk.name) {
              case 'startObject':
              case 'startArray':
                ++depth;
                break;
              case 'endObject':
              case 'endArray':
                --depth;
                break;
            }
            if (state === 'accept') {
              returnToken = combineManyMut(returnToken, chunk);
            }
            if (!depth) {
              if (once) {
                state = state === 'accept' ? 'pass' : 'all';
              } else {
                state = 'check';
              }
            }
            return returnToken;
          case 'accept-value':
          case 'reject-value':
            if (startTransition) {
              startTransition = false;
              returnToken = transition(stack, chunk, state, sanitizedOptions) || none;
            }
            if (state === 'accept-value') {
              returnToken = combineManyMut(returnToken, chunk);
            }
            if (chunk.name === endToken) {
              optionalToken = optionalTokens[endToken] || '';
              endToken = '';
              if (!optionalToken) {
                if (once) {
                  state = state === 'accept-value' ? 'pass' : 'all';
                } else {
                  state = 'check';
                }
              }
            }
            return returnToken;
        }

        // update the last index in the stack
        if (typeof stack[stack.length - 1] == 'number') {
          // array
          switch (chunk.name) {
            case 'startObject':
            case 'startArray':
            case 'startString':
            case 'startNumber':
            case 'nullValue':
            case 'trueValue':
            case 'falseValue':
              ++stack[stack.length - 1];
              break;
            case 'numberValue':
              if (previousToken !== 'endNumber') ++stack[stack.length - 1];
              break;
            case 'stringValue':
              if (previousToken !== 'endString') ++stack[stack.length - 1];
              break;
          }
        } else {
          if (chunk.name === 'keyValue') stack[stack.length - 1] = chunk.value;
        }
        previousToken = chunk.name;

        // check the token
        const action = checkableTokens[chunk.name] !== 1 ? nonCheckableAction : filter(stack, chunk) ? specialAction : defaultAction;

        endToken = stopTokens[chunk.name] || '';
        switch (action) {
          case 'process-key':
            if (chunk.name === 'startKey') {
              state = 'process-key';
              continue recheck;
            }
            break;
          case 'accept-token':
            if (endToken && optionalTokens[endToken]) {
              state = 'accept-value';
              startTransition = !!transition;
              continue recheck;
            }
            if (transition) returnToken = transition(stack, chunk, action, sanitizedOptions);
            returnToken = combineManyMut(returnToken, chunk);
            break;
          case 'accept':
            if (endToken) {
              state = optionalTokens[endToken] ? 'accept-value' : 'accept';
              startTransition = !!transition;
              continue recheck;
            }
            if (transition) returnToken = transition(stack, chunk, action, sanitizedOptions);
            returnToken = combineManyMut(returnToken, chunk);
            break;
          case 'reject':
            if (endToken) {
              state = optionalTokens[endToken] ? 'reject-value' : 'reject';
              startTransition = !!transition;
              continue recheck;
            }
            if (transition) returnToken = transition(stack, chunk, action, sanitizedOptions);
            break;
          case 'pass':
            state = 'pass';
            continue recheck;
        }

        break;
      }

      // update the stack
      switch (chunk.name) {
        case 'startObject':
          stack.push(null);
          break;
        case 'startArray':
          stack.push(-1);
          break;
        case 'endObject':
        case 'endArray':
          stack.pop();
          break;
      }

      return returnToken;
    });
  };

const makeStackDiffer =
  (previousStack = []) =>
  (stack, chunk, options) => {
    const returnTokens = [];

    // find the common part
    let commonLength = 0;
    for (const n = Math.min(stack.length, previousStack.length); commonLength < n && stack[commonLength] === previousStack[commonLength]; ++commonLength);

    // close old objects
    for (let i = previousStack.length - 1; i > commonLength; --i) {
      returnTokens.push({name: typeof previousStack[i] == 'number' ? 'endArray' : 'endObject'});
    }

    // update the index
    if (commonLength < previousStack.length) {
      if (commonLength < stack.length) {
        const key = stack[commonLength];
        if (typeof key == 'string') {
          if (options?.streamKeys) {
            returnTokens.push({name: 'startKey'}, {name: 'stringChunk', value: key}, {name: 'endKey'});
          }
          if (options?.packKeys || !options?.streamKeys) {
            returnTokens.push({name: 'keyValue', value: key});
          }
        } else if (typeof key == 'number' && options?.skippedArrayValue) {
          for (let i = Math.max(0, previousStack[commonLength] + 1); i < key; ++i) {
            returnTokens.push(...options.skippedArrayValue);
          }
        }
        previousStack[commonLength] = key;
        ++commonLength;
      } else {
        returnTokens.push({name: typeof previousStack[commonLength] == 'number' ? 'endArray' : 'endObject'});
      }
    }

    // remove old elements
    previousStack.splice(commonLength);

    // open new objects
    for (let i = commonLength; i < stack.length; ++i) {
      const key = stack[i];
      previousStack.push(key);
      if (typeof key == 'number') {
        if (key >= 0) {
          returnTokens.push({name: 'startArray'});
          if (options?.skippedArrayValue) {
            for (let j = 0; j < key; ++j) {
              returnTokens.push(...options.skippedArrayValue);
            }
          }
        }
      } else if (typeof key == 'string') {
        returnTokens.push({name: 'startObject'});
        if (options?.streamKeys) {
          returnTokens.push({name: 'startKey'}, {name: 'stringChunk', value: key}, {name: 'endKey'});
        }
        if (options?.packKeys || !options?.streamKeys) {
          returnTokens.push({name: 'keyValue', value: key});
        }
      }
    }

    // save the stack
    switch (chunk?.name) {
      case 'startObject':
        previousStack.push(null);
        break;
      case 'startArray':
        previousStack.push(-1);
        break;
    }

    return many(returnTokens);
  };

module.exports = filterBase;
module.exports.filterBase = filterBase;
module.exports.makeStackDiffer = makeStackDiffer;
