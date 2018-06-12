'use strict';

const StreamBase = require('./StreamBase');
const withParser = require('./withParser');

class StreamJsonObjects extends StreamBase {
  static streamJsonObjects(options) {
    return new StreamJsonObjects(options);
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
      this.push({index: this._counter++, value: this._assembler.current});
    }
    this._assembler.current = this._assembler.key = null;
  }

  static withParser(options) {
    return withParser(StreamJsonObjects.make, Object.assign({}, options, {jsonStreaming: true}));
  }
}
StreamJsonObjects.make = StreamJsonObjects.streamJsonObjects;

module.exports = StreamJsonObjects;
