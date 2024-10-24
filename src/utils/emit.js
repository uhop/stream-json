// @ts-self-types="./emit.d.ts"

'use strict';

const emit = stream => stream.on('data', item => stream.emit(item.name, item.value));

module.exports = emit;
