"use strict";


var util = require("util");
var Transform = require("stream").Transform;

var Assembler = require("./Assembler");

var Parser   = require("../Parser");
var Streamer = require("../Streamer");
var Packer   = require("../Packer");


function StreamArray(options){
	Transform.call(this, options);
	this._writableState.objectMode = true;
	this._readableState.objectMode = true;

	this.assembler = null;
	this.counter = 0;
}
util.inherits(StreamArray, Transform);

StreamArray.prototype._transform = function transform(chunk, encoding, callback){
	if(!this.assembler){
		// first chunk should open an array
		if(chunk.name !== "startArray"){
			callback(new Error("Top-level object should be an array."));
			return;
		}
		this.assembler = new Assembler();
	}

	this.assembler[chunk.name] && this.assembler[chunk.name](chunk.value);

	if(!this.assembler.stack.length && this.assembler.current.length){
		this.push({index: this.counter++, value: this.assembler.current.pop()});
	}

	callback();
};

StreamArray.make = function make(options){
	var streams = [new Parser(options), new Streamer(options)];

	var o = options ? Object.create(options) : {};
	o.packKeys = o.packStrings = o.packNumbers = true;

	streams.push(new Packer(o), new StreamArray(options));

	// connect pipes
	var input = streams[0], output = input;
	streams.forEach(function(stream, index){
		if(index){
			output = output.pipe(stream);
		}
	});

	return {streams: streams, input: input, output: output};
};

module.exports = StreamArray;
