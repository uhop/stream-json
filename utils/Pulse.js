'use strict';

const {Transform} = require('stream');
const withParser = require('./withParser');

class Pulse extends Transform {
  static make(options) {
    return new Pulse(options);
  }

  static withParser(options) {
    return withParser(Pulse.make, options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._accumulator = [];

    let handleBoundary = () => {
      this.push(this._accumulator);
      this._accumulator = [];
    };
    this.on('pipe', (src) => {
      src.on('boundary', handleBoundary);
    });
    this.on('unpipe', (src) => {
      src.off('boundary', handleBoundary);
    });
  }

  _transform(chunk, _, callback) {
    this._accumulator.push(chunk);
    callback(null);
  }

  _flush(callback) {
    if (this._accumulator.length) {
      this.push(this._accumulator);
      this._accumulator = null;
    }
    callback(null);
  }
}
Pulse.pulse = Pulse.make;
Pulse.make.Constructor = Pulse;

module.exports = Pulse;
