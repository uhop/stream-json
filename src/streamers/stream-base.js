// @ts-self-types="./stream-base.d.ts"

'use strict';

const {none} = require('stream-chain');
const {assembler} = require('../assembler');

class Counter {
  constructor(initialDepth) {
    this.depth = initialDepth;
  }
  startObject() {
    ++this.depth;
  }
  endObject() {
    --this.depth;
  }
  startArray() {
    ++this.depth;
  }
  endArray() {
    --this.depth;
  }
}

const streamBase =
  ({push, first, level}) =>
  (options = {}) => {
    const {objectFilter, includeUndecided} = options;
    let asm = assembler(options),
      state = first ? 'first' : 'check',
      savedAsm = null;

    if (typeof objectFilter != 'function') {
      if (state === 'check') return chunk => {
        if (asm[chunk.name]) {
          asm[chunk.name](chunk.value);
          if (asm.depth === level) {
            return push(asm);
          }
        }
        return none;
      };
      return chunk => {
        switch (state) {
          case 'first':
            first(chunk);
            state = 'accept';
          // fall through
          case 'accept':
            if (asm[chunk.name]) {
              asm[chunk.name](chunk.value);
              if (asm.depth === level) {
                return push(asm);
              }
            }
            break;
        }
        return none;
      };
    }

    return chunk => {
      switch (state) {
        case 'first':
          first(chunk);
          state = 'check';
        // fall through
        case 'check':
          if (asm[chunk.name]) {
            asm[chunk.name](chunk.value);
            const result = objectFilter(asm);
            if (result) {
              state = 'accept';
              if (asm.depth === level) return push(asm);
            } else if (result === false) {
              state = 'reject';
              savedAsm = asm;
              asm = new Counter(savedAsm.depth);
              savedAsm.dropToLevel(level);
            } else {
              if (asm.depth === level) {
                return push(asm, !includeUndecided);
              }
            }
          }
          break;
        case 'accept':
          if (asm[chunk.name]) {
            asm[chunk.name](chunk.value);
            if (asm.depth === level) {
              state = 'check';
              return push(asm);
            }
          }
          break;
        case 'reject':
          if (asm[chunk.name]) {
            asm[chunk.name](chunk.value);
            if (asm.depth === level) {
              state = 'check';
              asm = savedAsm;
              savedAsm = null;
            }
          }
          break;
      }
      return none;
    };
  };

module.exports = streamBase;
module.exports.streamBase = streamBase;
