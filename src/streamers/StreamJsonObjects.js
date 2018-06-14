'use strict';

const StreamBase = require('./StreamBase');
const withParser = require('../utils/withParser');

class StreamJsonObjects extends StreamBase {
  static make(options) {
    return new StreamJsonObjects(options);
  }

  static withParser(options) {
    return withParser(StreamJsonObjects.make, Object.assign({}, options, {jsonStreaming: true}));
  }

  constructor(options) {
    super(options);
    this._counter = null;
    this._level = 0;
  }

  _push(discard) {
    if (discard) {
      ++this._counter;
    } else {
      this.push({key: this._counter++, value: this._assembler.current});
    }
    this._assembler.current = this._assembler.key = null;
  }
}
StreamJsonObjects.streamJsonObjects = StreamJsonObjects.make;
StreamJsonObjects.make.Constructor = StreamJsonObjects;

module.exports = StreamJsonObjects;
