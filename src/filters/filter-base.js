// @ts-self-types="./filter-base.d.ts"

'use strict';

const {many, isMany, getManyValues, none, flushable} = require('stream-chain');

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
  ({defaultAction = 'ignore', specialAction = 'accept', transition} = {}) =>
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
          const returnToken = state === 'accept-value' ? chunk : none;
          optionalToken = '';
          state = once ? 'pass' : 'check';
          return returnToken;
        }
        optionalToken = '';
        state = once ? 'pass' : 'check';
      }

      let returnToken = none;

      recheck: for (;;) {
        // accept/reject tokens
        switch (state) {
          case 'pass':
            return none;
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
              if (returnToken === none) {
                returnToken = chunk;
              } else if (isMany(returnToken)) {
                const tokens = getManyValues(returnToken);
                tokens.push(chunk);
                returnToken = many(tokens);
              } else {
                returnToken = many([returnToken, chunk]);
              }
            }
            if (!depth) state = once ? 'pass' : 'check';
            return returnToken;
          case 'accept-value':
          case 'reject-value':
            if (startTransition) {
              startTransition = false;
              returnToken = transition(stack, chunk, state, sanitizedOptions) || none;
            }
            if (state === 'accept-value') {
              if (returnToken === none) {
                returnToken = chunk;
              } else if (isMany(returnToken)) {
                const tokens = getManyValues(returnToken);
                tokens.push(chunk);
                returnToken = many(tokens);
              } else {
                returnToken = many([returnToken, chunk]);
              }
            }
            if (chunk.name === endToken) {
              optionalToken = optionalTokens[endToken] || '';
              endToken = '';
              if (!optionalToken) state = once ? 'pass' : 'check';
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
        const action = checkableTokens[chunk.name] === 1 && filter(stack, chunk) ? specialAction : defaultAction;

        endToken = stopTokens[chunk.name] || '';
        switch (action) {
          case 'accept-token':
            if (endToken) {
              if (optionalTokens[endToken]) {
                state = 'accept-value';
                startTransition = !!transition;
                continue recheck;
              }
            }
            if (transition) returnToken = transition(stack, chunk, action, sanitizedOptions);
            if (returnToken === none) {
              returnToken = chunk;
            } else if (isMany(returnToken)) {
              const tokens = getManyValues(returnToken);
              tokens.push(chunk);
              returnToken = many(tokens);
            } else {
              returnToken = many([returnToken, chunk]);
            }
            break;
          case 'accept':
            if (endToken) {
              state = optionalTokens[endToken] ? 'accept-value' : 'accept';
              startTransition = !!transition;
              continue recheck;
            }
            if (transition) returnToken = transition(stack, chunk, action, sanitizedOptions);
            if (returnToken === none) {
              returnToken = chunk;
            } else if (isMany(returnToken)) {
              const tokens = getManyValues(returnToken);
              tokens.push(chunk);
              returnToken = many(tokens);
            } else {
              returnToken = many([returnToken, chunk]);
            }
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
            state = action;
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

module.exports = filterBase;
module.exports.filterBase = filterBase;
