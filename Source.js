'use strict';

const {EventEmitter} = require('events');

class Source extends EventEmitter {
  constructor(streams) {
    super();

    if (!(streams instanceof Array) || !streams.length) {
      throw Error("Source's argument should be a non-empty array.");
    }

    this.streams = streams;

    // connect pipes
    const input = (this.input = streams[0]);
    let output = input;
    streams.forEach((stream, index) => index && (output = output.pipe(stream)));
    this.output = output;

    // connect events
    output.on('data', item => this.emit(item.name, item.value));
    output.on('end', () => this.emit('end'));
  }
}

module.exports = Source;
